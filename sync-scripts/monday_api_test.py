#!/usr/bin/env python3
"""
Monday API test script for testing column value formatting.
"""

import sys
import json
from monday_api import monday_api

def test_create_item():
    """Test creating a simple item with proper formatting for status columns."""
    # Board ID for Master Projects
    board_id = 6727219152
    
    # Create an item with minimal values
    item_name = "TEST_API_FORMAT"
    
    # Prepare column values
    column_values = {}
    
    # Status column - job_division___1__1
    column_values["job_division___1__1"] = {"index": 1}
    
    # Convert to JSON string
    column_values_str = json.dumps(column_values)
    
    # Create query
    query = f"""
    mutation {{
        create_item(board_id: {board_id}, item_name: "{item_name}", column_values: {json.dumps(column_values_str)}) {{
            id
        }}
    }}
    """
    
    print(f"Query: {query}")
    
    # Execute query
    result = monday_api.execute_query(query)
    print(f"Result: {json.dumps(result, indent=2)}")
    
    return result

if __name__ == "__main__":
    test_create_item()
