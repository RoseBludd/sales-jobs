import requests
import json

# Monday.com API configuration
API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjMxOTcyMjAwMywiYWFpIjoxMSwidWlkIjo1NDE1NDI4MSwiaWFkIjoiMjAyNC0wMi0wOVQyMzowODo0Ni4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTI4NDMxMTksInJnbiI6InVzZTEifQ.xshH7gVvlzc89H7bePImbYudk58FLS9vmr6NggMhxeY"
BOARD_ID = "6727219152"
API_URL = "https://api.monday.com/v2"

def fetch_board_metadata():
    try:
        # GraphQL query to get board columns and their details
        query = """
        query {
          boards(ids: [%s]) {
            name
            columns {
              id
              title
              type
              settings_str
            }
            items_page {
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                }
              }
            }
          }
        }
        """ % BOARD_ID

        # Make the API request
        headers = {"Authorization": API_KEY}
        data = {"query": query}
        response = requests.post(API_URL, json=data, headers=headers)
        response_data = response.json()

        if "data" not in response_data or "boards" not in response_data["data"]:
            print("Error: Invalid response structure")
            return

        board = response_data["data"]["boards"][0]
        board_name = board["name"]
        columns = board["columns"]
        items = board["items_page"]["items"]

        # Create markdown documentation
        markdown_content = f"""# Monday.com Board Documentation

## Board Details
- **Board ID**: {BOARD_ID}
- **Board Name**: {board_name}

## Columns
| Column ID | Title | Type | Description |
|-----------|-------|------|-------------|
"""
        
        # Add each column to the documentation
        for col in columns:
            settings = json.loads(col.get("settings_str", "{}"))
            description = ""
            
            # Get sample values for the column
            sample_values = set()
            for item in items[:5]:  # Look at first 5 items
                for val in item["column_values"]:
                    if val["id"] == col["id"] and val["text"]:
                        sample_values.add(val["text"])
            
            if sample_values:
                description = f"Sample values: {', '.join(list(sample_values)[:3])}"
            
            markdown_content += f"| {col['id']} | {col['title']} | {col['type']} | {description} |\n"

        # Add usage examples
        markdown_content += """
## Usage in Code

### TypeScript/JavaScript
```typescript
// Column IDs for reference
const COLUMN_IDS = {
"""
        for col in columns:
            safe_name = col['title'].lower().replace(' ', '_')
            markdown_content += f"  {safe_name}: '{col['id']}',\n"
        
        markdown_content += """};
```

### Important Notes
- The email column is used for user identification and job matching
- Column values may be empty in some cases, always check for null/undefined
- Some columns may contain formatted text or special values
"""

        # Write to file with UTF-8 encoding
        with open("monday_board_documentation.md", "w", encoding='utf-8') as f:
            f.write(markdown_content)
            
        print("✅ Documentation generated successfully!")
        
        # Print column details to console for verification
        print("\nColumn Details:")
        for col in columns:
            print(f"- {col['title']} ({col['id']}): {col['type']}")

    except Exception as e:
        print(f"Error fetching board metadata: {str(e)}")

def get_email5_1_values():
    try:
        cursor = None
        all_items = []
        page = 1
        
        while True:
            print(f"\nFetching page {page} (cursor: {cursor})")
            # GraphQL query with cursor-based pagination
            query = """
            query {
              boards(ids: [%s]) {
                items_page(limit: 25, cursor: %s) {
                  cursor
                  items {
                    id
                    name
                    column_values(ids: ["email5__1", "text49__1", "text22__1"]) {
                      id
                      text
                      value
                      type
                    }
                  }
                }
              }
            }
            """ % (BOARD_ID, f'"{cursor}"' if cursor else "null")

            # Make the API request
            headers = {"Authorization": API_KEY}
            data = {"query": query}
            response = requests.post(API_URL, json=data, headers=headers)
            response_data = response.json()

            if "data" not in response_data or "boards" not in response_data["data"]:
                print("Error: Invalid response structure")
                print("Response:", json.dumps(response_data, indent=2))
                return

            items_page = response_data["data"]["boards"][0]["items_page"]
            items = items_page["items"]
            print(f"Found {len(items)} items on this page")
            all_items.extend(items)
            
            cursor = items_page.get("cursor")
            if not cursor:
                print("No more pages to fetch")
                break
                
            page += 1
            if page > 10:  # Safety limit
                print("Reached maximum page limit")
                break

        print(f"\nTotal items found across all pages: {len(all_items)}")
        
        email_values = []
        print("\nProcessing items...")
        for item in all_items:
            sales_rep_info = {
                "name": item["name"],
                "first_name": "",
                "last_name": "",
                "email": ""
            }
            
            for column in item["column_values"]:
                if column["id"] == "email5__1":
                    sales_rep_info["email"] = column["text"] or (json.loads(column["value"])["text"] if column["value"] else "")
                elif column["id"] == "text49__1":
                    sales_rep_info["last_name"] = column["text"]
                elif column["id"] == "text22__1":
                    sales_rep_info["first_name"] = column["text"]
            
            if any([sales_rep_info["email"], sales_rep_info["first_name"], sales_rep_info["last_name"]]):
                print(f"\nItem: {sales_rep_info['name']}")
                if sales_rep_info["first_name"] or sales_rep_info["last_name"]:
                    print(f"Sales Rep: {sales_rep_info['first_name']} {sales_rep_info['last_name']}")
                if sales_rep_info["email"]:
                    print(f"Email: {sales_rep_info['email']}")
                    email_values.append(sales_rep_info["email"])

        print("\nEmail5__1 Values found:", len(email_values))
        for email in email_values:
            print(f"- {email}")

        return email_values

    except Exception as e:
        print(f"Error fetching email5__1 values: {str(e)}")
        if 'response_data' in locals():
            print("Full error:", json.dumps(response_data, indent=2))
        return []

def check_sales_rep_email(email_to_check):
    try:
        # GraphQL query using search
        query = """
        query {
          boards(ids: [%s]) {
            items_page(
              limit: 1,
              query: "%s"
            ) {
              items {
                id
                name
                column_values(ids: "email5__1") {
                  id
                  text
                  value
                }
              }
            }
          }
        }
        """ % (BOARD_ID, email_to_check)

        # Make the API request
        headers = {"Authorization": API_KEY}
        data = {"query": query}
        response = requests.post(API_URL, json=data, headers=headers)
        response_data = response.json()

        print("\nAPI Response:")
        print(json.dumps(response_data, indent=2))

        if "data" not in response_data or "boards" not in response_data["data"]:
            print("Error: Invalid response structure")
            return False, None

        items = response_data["data"]["boards"][0]["items_page"]["items"]
        print(f"\nFound {len(items)} matching items")
        
        if not items:
            return False, None

        # Get the first matching item
        item = items[0]
        column = item["column_values"][0]  # We only requested email5__1
        
        # Double check the email matches (case insensitive)
        column_email = column["text"] or (json.loads(column["value"])["text"] if column["value"] else "")
        if column_email.lower() == email_to_check.lower():
            return True, {
                "item_id": item["id"],
                "job_name": item["name"]
            }

        return False, None

    except Exception as e:
        print(f"Error checking email: {str(e)}")
        if 'response_data' in locals():
            print("\nFull API response:")
            print(json.dumps(response_data, indent=2))
        return False, None

# Example usage
if __name__ == "__main__":
    test_email = "b.miller@restoremastersllc.com"
    print(f"\nChecking for email: {test_email}")
    exists, details = check_sales_rep_email(test_email)
    if exists:
        print(f"\nEmail {test_email} found!")
        print(f"Job: {details['job_name']}")
    else:
        print(f"\nEmail {test_email} not found in the board")