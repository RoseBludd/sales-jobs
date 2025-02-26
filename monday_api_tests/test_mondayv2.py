import requests
import json
import time

def get_unique_column_values(api_key, board_id, column_id):
    """
    Fetch all unique values for a specific column from a Monday.com board
    
    Args:
        api_key (str): Your Monday.com API key
        board_id (str): The ID of the board to query
        column_id (str): The ID of the column to fetch unique values from
        
    Returns:
        list: A list of unique values from the specified column
    """
    url = "https://api.monday.com/v2"
    headers = {
        "Content-Type": "application/json",
        "Authorization": api_key
    }
    
    unique_values = set()  # Use a set to automatically handle uniqueness
    next_cursor = None
    has_more_items = True
    page_size = 500  # Reduced page size
    
    while has_more_items:
        # Build the query with cursor if we have one
        query = """
        query {
            boards(ids: %s) {
                items_page(limit: %d%s) {
                    cursor
                    items {
                        column_values(ids: ["%s"]) {
                            text
                        }
                    }
                }
            }
        }
        """ % (board_id, page_size, f', cursor: "{next_cursor}"' if next_cursor else '', column_id)
        
        data = {"query": query}
        
        try:
            # Make the API request
            response = requests.post(url=url, json=data, headers=headers)
            
            if response.status_code == 429:  # Rate limit
                print("Rate limit hit, waiting 60 seconds...")
                time.sleep(60)
                continue
                
            if response.status_code != 200:
                print(f"Error: API responded with status code {response.status_code}")
                print(response.text)
                break
                
            result = response.json()
            
            # Check for errors in the response
            if "errors" in result:
                print("GraphQL Errors:", json.dumps(result["errors"], indent=2))
                break
            
            # Process the response
            board_data = result.get("data", {}).get("boards", [])[0]
            if not board_data:
                print("No board data returned")
                break
                
            items_page = board_data.get("items_page", {})
            items = items_page.get("items", [])
            
            # Extract the column values from each item
            for item in items:
                column_values = item.get("column_values", [])
                for cv in column_values:
                    if cv.get("text"):
                        unique_values.add(cv.get("text"))
            
            # Get the next cursor
            next_cursor = items_page.get("cursor")
            
            # If no cursor or empty items list, we're done
            if not next_cursor or not items:
                has_more_items = False
            else:
                # Add a small delay between requests
                time.sleep(0.5)
                
            print(f"Processed batch. Current unique values count: {len(unique_values)}")
            
        except requests.exceptions.RequestException as e:
            print(f"Request error: {e}")
            time.sleep(5)  # Wait 5 seconds before retrying
            continue
        except (IndexError, KeyError) as e:
            print(f"Error processing response: {e}")
            print(f"Response: {json.dumps(result, indent=2)}")
            break
    
    return sorted(list(unique_values))

if __name__ == "__main__":
    # Replace these values with your actual information
    API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjMxOTcyMjAwMywiYWFpIjoxMSwidWlkIjo1NDE1NDI4MSwiaWFkIjoiMjAyNC0wMi0wOVQyMzowODo0Ni4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTI4NDMxMTksInJnbiI6InVzZTEifQ.xshH7gVvlzc89H7bePImbYudk58FLS9vmr6NggMhxeY"
    BOARD_ID = "6727219152"
    COLUMN_ID = "text95__1"
    
    try:
        unique_values = get_unique_column_values(API_KEY, BOARD_ID, COLUMN_ID)
        
        print(f"\nFound {len(unique_values)} unique values in column {COLUMN_ID}:")
        for value in unique_values:
            print(f"- {value}")
        
        # Save to a file
        output_file = f"{COLUMN_ID}_unique_values.txt"
        with open(output_file, "w", encoding='utf-8') as f:
            for value in unique_values:
                f.write(f"{value}\n")
        print(f"\nResults saved to {output_file}")
        
    except Exception as e:
        print(f"Error running script: {e}")