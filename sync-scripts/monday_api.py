import os
import requests
import json
import time
from datetime import datetime
from typing import List, Dict, Any, Optional, Union
from data_cache import save_monday_data, load_monday_data
from timing import TimingStats, timed_operation

# Environment variables
MONDAY_API_KEY = os.environ.get('MONDAY_API_KEY','eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjMxOTcyMjAwMywiYWFpIjoxMSwidWlkIjo1NDE1NDI4MSwiaWFkIjoiMjAyNC0wMi0wOVQyMzowODo0Ni4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTI4NDMxMTksInJnbiI6InVzZTEifQ.xshH7gVvlzc89H7bePImbYudk58FLS9vmr6NggMhxeY')
BOARD_ID_USERS = os.environ.get('MONDAY_BOARD_ID_USERS', '5764059860')
BOARD_ID_DATA = os.environ.get('MONDAY_BOARD_ID_DATA', '6727219152')

# API URL
MONDAY_API_URL = 'https://api.monday.com/v2'

# Column mappings
MASTER_PROJECT_COLUMN_MAP = {
    # Project related columns
    'text95__1': 'status',
    'link__1': 'link',
    'text01__1': 'name',
    'text40__1': 'description',
    'text_7__1': 'company_cam_link',
    'numbers0': 'estimated_value',
    'qb_total_payments__1': 'total_payment',
    
    # Customer related columns
    'text65__1': 'name',              # Job Progress Contact Full Name
    'email4__1': 'email',             # JP Contact Email
    'dup__of_job_address0__1': 'address', # Jp Contact Address - this will be parsed
    'text43__1': 'notes',             # Job Progress Customer note
    'phone_1__1': 'phone',
    
    # Sales Team related columns
    'job_division___1__1': 'team_name',  # Sales Team Name
    
    # Partner
    'partner_name__1': 'partner_name',
    'partner_email__1': 'partner_email',
    'partner_phone____1': 'partner_phone',
    
    # Project Manager
    'text19__1': 'pm_name',           # Project manager name
    'phone_13__1': 'pm_phone',        # PM number
    'email6__1': 'pm_email',          # PM email
    
    # Estimator
    'job_est_1_name__1': 'estimator_name',
    'phone_10__1': 'estimator_phone',
    'email0__1': 'estimator_email',
    
    # Superintendent
    'dup__of_text6__1': 'superintendent_name',
    'dup__of_phone_1__1': 'superintendent_phone',
    'dup__of_email__1': 'superintendent_email',
    
    # Sales Representative
    'text22__1': 'sales_rep_first_name',
    'text49__1': 'sales_rep_last_name',
    'sales_rep_phone____1': 'sales_rep_phone',
    'email5__1': 'sales_rep_email',
    
    # PA/Law related
    'jp_pa_law_name__1': 'pa_law_name',
    'jp_pa_law_phone__1': 'pa_law_phone',
    'jp_pa_law_email__1': 'pa_law_email',
    
    # Claim related
    'claim_number__1': 'claim_number',
    
    # Policy related
    'dup__of_text0__1': 'policy_number',
    
    # Insurance related
    'text31__1': 'insurance_company_name',
    'phone_132__1': 'insurance_company_phone',
    'email05__1': 'insurance_company_email',
    'phone_17__1': 'adjuster_phone',
    'email57__1': 'adjuster_email',
    
    # Storm related
    'date_19__1': 'date_of_loss',
    
    # Property related
    'files9__1': 'measurements',
    'files66__1': 'one_click_codes'
}

# Column mapping for Sales Staff Board
SALES_STAFF_COLUMN_MAP = {
    'text25': 'first_name',
    'text1': 'last_name',
    'email7': 'rm_email',
    'email__1': 'wra_email',
    'status_13': 'monday_team',
    'files3': 'identification_files',
    'files_1': 'onboarding_files',
    'text6': 'shirt_size',
    'phone': 'phone',
    'text': 'address',
    'text2': 'city',
    'text5': 'state',
    'text57': 'zip'
}

class MondayAPI:
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the Monday.com API client."""
        self.api_key = api_key or MONDAY_API_KEY
        if not self.api_key:
            raise ValueError("Monday.com API key not found in environment variables")
        
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": self.api_key
        }
        # Create timing stats for this API instance
        self.timing_stats = TimingStats("monday_api")
    
    def execute_query(self, query: str) -> Dict[str, Any]:
        """Execute a GraphQL query against the Monday.com API."""
        with timed_operation(self.timing_stats, "execute_query"):
            try:
                # Add rate limiting to avoid hitting Monday.com API too frequently
                time.sleep(0.2)  # 200ms delay between requests
                
                # Print the actual query for debugging (limit to 500 chars if very long)
                print(f"📝 Query being sent:")
                print(f"{query[:500]}{'...' if len(query) > 500 else ''}")
                
                response = requests.post(
                    MONDAY_API_URL,
                    headers=self.headers,
                    json={"query": query}
                )
                
                # Print detailed request information for debugging
                print(f"📝 API Request to: {MONDAY_API_URL}")
                print(f"📝 Request payload length: {len(query)} characters")
                
                # Try to get error details even if it's not a 2xx status
                try:
                    result = response.json()
                    if "errors" in result:
                        error_message = "; ".join([error["message"] for error in result["errors"]])
                        print(f"❌ GraphQL Error: {error_message}")
                        raise Exception(f"Monday.com API error: {error_message}")
                except ValueError:
                    # Not JSON response
                    pass
                
                # Now check HTTP status
                response.raise_for_status()
                
                # Parse the response if we haven't already
                if 'result' not in locals():
                    result = response.json()
                
                # Check for errors in the response
                if "errors" in result:
                    error_message = "; ".join([error["message"] for error in result["errors"]])
                    print(f"❌ GraphQL Error: {error_message}")
                    raise Exception(f"Monday.com API error: {error_message}")
                
                return result
            except requests.exceptions.RequestException as e:
                # Print more detailed error information
                print(f"❌ Error executing query: {str(e)}")
                if hasattr(e, 'response') and e.response:
                    try:
                        error_details = e.response.json()
                        print(f"📝 Error response details: {json.dumps(error_details, indent=2)}")
                    except:
                        print(f"📝 Error response status: {e.response.status_code}")
                        print(f"📝 Error response text: {e.response.text[:500]}...")
                raise
    
    def fetch_all_board_items(self, board_id: str, use_cache: bool = False, cache_filename: str = None, 
                             column_ids: List[str] = None, query_params: str = None, max_pages: int = None) -> List[Dict[str, Any]]:
        """Fetch all items from a board with pagination.
        
        Args:
            board_id: The Monday.com board ID
            use_cache: Whether to try loading from cache first
            cache_filename: Specific cache file to load from
            column_ids: List of specific column IDs to fetch (default: fetch all)
            query_params: Additional query parameters for filtering
            max_pages: Maximum number of pages to fetch (default: all pages)
            
        Returns:
            List[Dict[str, Any]]: List of board items
        """
        print(f"🔍 Fetching all items from board: {board_id}")
        
        # Try to load from cache first if requested
        if use_cache:
            print(f"🔄 Attempting to load data from cache for board {board_id}")
            cached_data = load_monday_data(cache_filename, board_id)
            if cached_data:
                cache_info = "specified cache file" if cache_filename else "latest cache"
                print(f"✅ Loaded {len(cached_data)} items from {cache_info}")
                return cached_data
            else:
                print(f"⚠️ No cached data found for board {board_id}, fetching from API")
        
        # If not using cache or no cache found, fetch from API
        with timed_operation(self.timing_stats, f"fetch_board_{board_id}"):
            all_items = []
            next_cursor = None
            has_more_items = True
            page_count = 0
            
            try:
                while has_more_items:
                    cursor_param = f', cursor: "{next_cursor}"' if next_cursor else ''
                    query_param = f', {query_params}' if query_params else ''
                    column_filter = f"(ids: {json.dumps(column_ids)})" if column_ids else ""
                    
                    page_count += 1
                    
                    # Exit if we've reached the maximum pages to fetch
                    if max_pages and page_count > max_pages:
                        print(f"✓ Reached maximum pages limit ({max_pages})")
                        break
                    
                    print(f"  📄 Fetching page {page_count}...")
                    
                    query = f"""
                    query {{
                        boards(ids: [{int(board_id)}]) {{
                            name
                            items_page(limit: 250 {cursor_param} {query_param}) {{
                                cursor
                                items {{
                                    id
                                    name
                                    column_values{column_filter} {{
                                        id
                                        text
                                        value
                                    }}
                                }}
                            }}
                        }}
                    }}
                    """
                    
                    with timed_operation(self.timing_stats, f"fetch_page_{page_count}"):
                        result = self.execute_query(query)
                    
                    # Extract items from response
                    boards_data = result.get('data', {}).get('boards', [])
                    if not boards_data:
                        break
                    
                    board_data = boards_data[0]
                    board_name = board_data.get('name', 'Unknown')
                    items_page = board_data.get('items_page', {})
                    items = items_page.get('items', [])
                    
                    print(f"  ✓ Received {len(items)} items from page {page_count} of '{board_name}' board")
                    
                    # Add items to our collection
                    all_items.extend(items)
                    
                    # Check if we have more items to fetch
                    next_cursor = items_page.get('cursor')
                    has_more_items = next_cursor is not None
                
                print(f"✅ Successfully fetched {len(all_items)} items from board {board_id} ({page_count} pages)")
                
                # Save the data to cache
                cache_filename = save_monday_data(board_id, all_items)
                print(f"💾 Saved data to cache file: {cache_filename}")
                
                # Save timing stats
                stats_file = self.timing_stats.save_to_file()
                print(f"📊 Timing statistics saved to: {stats_file}")
                
                return all_items
                
            except Exception as e:
                print(f"❌ Error fetching items from board {board_id}: {str(e)}")
                raise
    
    def update_monday_item(self, board_id: str, item_id: str, column_id: str, value: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Update a specific column value for an item in Monday.com."""
        # Format value as needed
        formatted_value = self.format_column_value(value)
        
        query = f"""
        mutation {{
            change_column_value(board_id: {board_id}, item_id: {item_id}, column_id: "{column_id}", value: {formatted_value}) {{
                id
            }}
        }}
        """
        
        return self.execute_query(query)
    
    def format_column_value(self, value: Any, column_id: str = None) -> str:
        """Format a column value according to Monday.com's requirements."""
        if value is None:
            return '""'
        elif isinstance(value, dict):
            if 'index' in value:  # Status columns
                # Don't stringify the index value
                return json.dumps({'index': value['index']})
            else:
                return json.dumps(value)
        return json.dumps(str(value))

    def create_monday_item(self, board_id: str, item_name: str, column_values: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new item in Monday.com with specified column values."""
        # Format each column value according to Monday.com's requirements
        formatted_values = {}
        for col_id, value in column_values.items():
            formatted_values[col_id] = self.format_column_value(value, col_id)

        # Convert to JSON string
        values_json = json.dumps(formatted_values)
        
        query = f"""
        mutation {{
            create_item(board_id: {board_id}, item_name: "{item_name}", column_values: {json.dumps(values_json)}) {{
                id
            }}
        }}
        """
        
        return self.execute_query(query)
    
    def delete_monday_item(self, board_id: str, item_id: str) -> Dict[str, Any]:
        """Delete an item from Monday.com."""
        query = f"""
        mutation {{
            delete_item(item_id: {item_id}) {{
                id
            }}
        }}
        """
        
        return self.execute_query(query)
    
    def format_column_value(self, value: Union[str, Dict[str, Any]]) -> str:
        """Format value according to Monday.com's requirements."""
        if isinstance(value, dict):
            return json.dumps(value)
        elif value is None:
            return '""'
        else:
            return f'"{value}"'

    def get_item_by_id(self, board_id: str, item_id: str) -> Dict[str, Any]:
        """Get a specific item by ID."""
        query = f"""
        query {{
            items(ids: [{item_id}]) {{
                id
                name
                board {{
                    id
                }}
                column_values {{
                    id
                    text
                    value
                }}
            }}
        }}
        """
        
        result = self.execute_query(query)
        items = result.get('data', {}).get('items', [])
        
        if not items:
            return None
            
        return items[0]
    
    def subscribe_to_board_events(self, board_id: str, event_type: str, webhook_url: str) -> Dict[str, Any]:
        """Subscribe to board events for real-time updates."""
        query = f"""
        mutation {{
            create_webhook(board_id: {board_id}, event: "{event_type}", url: "{webhook_url}") {{
                id
                board_id
            }}
        }}
        """
        
        return self.execute_query(query)
    
    def get_webhooks(self) -> List[Dict[str, Any]]:
        """Get all webhooks for the account."""
        query = """
        query {
            webhooks {
                id
                board_id
                event
                url
            }
        }
        """
        
        result = self.execute_query(query)
        return result.get('data', {}).get('webhooks', [])

# Create an instance of the API client
monday_api = MondayAPI()

def test_monday_connection():
    """Test the connection to Monday.com API and verify credentials."""
    print("🔍 Testing Monday.com API connection...")
    try:
        # Simple query to test the connection
        query = """
        query {
            me {
                name
                email
            }
        }
        """
        
        result = monday_api.execute_query(query)
        user_info = result.get('data', {}).get('me', {})
        
        if user_info:
            print(f"✅ Successfully connected to Monday.com API")
            print(f"👤 Authenticated as: {user_info.get('name', 'Unknown')} ({user_info.get('email', 'Unknown')})")
            return True
        else:
            print("❌ Could not retrieve user information")
            return False
            
    except Exception as e:
        print(f"❌ Failed to connect to Monday.com API: {str(e)}")
        return False
