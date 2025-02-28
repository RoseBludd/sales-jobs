#!/usr/bin/env python
"""
Create test data in Monday.com for testing the sync functionality.
This script will create test items with all necessary column values
for both the Master Project board and the Sales Staff board.
"""

import os
import sys
import json
import uuid
import random
import argparse
from datetime import datetime, timedelta
from monday_api import monday_api, MASTER_PROJECT_COLUMN_MAP

# Constants for test data
TEST_PREFIX = "TEST_DATA_"
NUM_TEST_ITEMS = 3  # Default number of test items per board

# Board IDs
MASTER_BOARD_ID = os.environ.get('MONDAY_BOARD_ID_DATA', '6727219152')  # Master project board
STAFF_BOARD_ID = os.environ.get('MONDAY_BOARD_ID_USERS', '5764059860')  # Sales staff board

# Test data templates
test_addresses = [
    "123 Main St, Dallas, TX 75201",
    "456 Oak Avenue, Houston, TX 77002",
    "789 Pine Road, Austin, TX 78701",
    "101 Cedar Lane, San Antonio, TX 78205",
    "202 Elm Boulevard, Fort Worth, TX 76102"
]

test_names = [
    "John Smith",
    "Jane Doe",
    "Robert Johnson",
    "Sarah Williams",
    "Michael Brown"
]

test_first_names = [
    "John",
    "Jane",
    "Robert",
    "Sarah",
    "Michael"
]

test_last_names = [
    "Smith",
    "Doe",
    "Johnson",
    "Williams",
    "Brown"
]

test_emails = [
    "john.smith@example.com",
    "jane.doe@example.com",
    "robert.johnson@example.com",
    "sarah.williams@example.com",
    "michael.brown@example.com"
]

test_phones = [
    "(214) 555-1234",
    "(713) 555-5678",
    "(512) 555-9012",
    "(210) 555-3456",
    "(817) 555-7890"
]

test_shirt_sizes = [
    "S",
    "M",
    "L",
    "XL",
    "XXL"
]

# Updated valid status indexes for both boards
# Master board team names (job_division___1__1) - From API query results
master_team_names = [1, 3, 4, 6, 13]  # Team Valdosta, Team Jesk, Team Atlanta, Team Austin, Team Denver

# Staff board team names (status_13) - From API query results
staff_team_names = ["1", "3", "6", "7", "13"]  # Dallas, Atlanta, Chicago, Denver, Nashville


def create_master_board_item(index):
    """Create a single test item for the Master Project board."""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    item_name = f"{TEST_PREFIX}PROJECT_{index+1}_{timestamp}"
    
    # Generate random values for numeric fields
    estimated_value = random.randint(5000, 50000)
    total_payment = random.randint(1000, estimated_value)
    
    # Using column_values as a JSON object that will be converted to a string
    column_values = {}

    # Project Information
    column_values["link__1"] = {"url": f"https://example.com/test-job-{index+1}"}
    column_values["text01__1"] = f"Test Project {index+1}"
    column_values["text40__1"] = f"This is a test project {index+1} created for sync testing"
    column_values["text_7__1"] = f"https://companycam.com/test-{index+1}"
    column_values["numbers0"] = str(estimated_value)
    column_values["qb_total_payments__1"] = str(total_payment)
    
    # Customer Information
    column_values["text43__1"] = f"Test customer notes for {index+1}"
    column_values["text65__1"] = test_names[index % len(test_names)]
    column_values["email4__1"] = {"email": test_emails[index % len(test_emails)], "text": test_emails[index % len(test_emails)]}
    column_values["dup__of_job_address0__1"] = test_addresses[index % len(test_addresses)]
    column_values["phone_1__1"] = {"phone": test_phones[index % len(test_phones)], "countryShortName": "US"}
    
    # Sales Teams - Use a valid index value with special Monday.com status format
    column_values["job_division___1__1"] = {"index": master_team_names[index % len(master_team_names)]}
    
    # Partner
    column_values["partner_name__1"] = f"Partner {index+1}"
    column_values["partner_email__1"] = {"email": f"partner{index+1}@example.com", "text": f"partner{index+1}@example.com"}
    column_values["partner_phone____1"] = {"phone": f"(999) 555-{1000+index}", "countryShortName": "US"}
    
    # Project Manager
    column_values["text19__1"] = f"PM {index+1}"
    column_values["phone_13__1"] = {"phone": f"(888) 555-{1000+index}", "countryShortName": "US"}
    column_values["email6__1"] = {"email": f"pm{index+1}@example.com", "text": f"pm{index+1}@example.com"}
    
    # Estimator
    column_values["job_est_1_name__1"] = f"Estimator {index+1}"
    column_values["phone_10__1"] = {"phone": f"(777) 555-{1000+index}", "countryShortName": "US"}
    column_values["email0__1"] = {"email": f"estimator{index+1}@example.com", "text": f"estimator{index+1}@example.com"}
    
    # Superintendent
    column_values["dup__of_text6__1"] = f"Superintendent {index+1}"
    column_values["dup__of_phone_1__1"] = {"phone": f"(666) 555-{1000+index}", "countryShortName": "US"}
    column_values["dup__of_email__1"] = {"email": f"super{index+1}@example.com", "text": f"super{index+1}@example.com"}
    
    # Sales Representative
    column_values["text22__1"] = test_first_names[index % len(test_first_names)]
    column_values["text49__1"] = test_last_names[index % len(test_last_names)]
    column_values["sales_rep_phone____1"] = {"phone": f"(555) 555-{1000+index}", "countryShortName": "US"}
    column_values["email5__1"] = {"email": f"salesrep{index+1}@example.com", "text": f"salesrep{index+1}@example.com"}
    
    # PA/Law Information
    column_values["jp_pa_law_name__1"] = f"PA Law {index+1}"
    column_values["jp_pa_law_phone__1"] = {"phone": f"(444) 555-{1000+index}", "countryShortName": "US"}
    column_values["jp_pa_law_email__1"] = {"email": f"palaw{index+1}@example.com", "text": f"palaw{index+1}@example.com"}
    
    # Insurance and Claims Information
    column_values["claim_number__1"] = f"CLM-TEST-{10000+index}"
    column_values["dup__of_text0__1"] = f"POL-TEST-{20000+index}"
    column_values["text31__1"] = f"Test Insurance Co {index+1}"
    column_values["phone_132__1"] = {"phone": f"(333) 555-{1000+index}", "countryShortName": "US"}
    column_values["email05__1"] = {"email": f"insurance{index+1}@example.com", "text": f"insurance{index+1}@example.com"}
    column_values["phone_17__1"] = {"phone": f"(222) 555-{1000+index}", "countryShortName": "US"}
    column_values["email57__1"] = {"email": f"adjuster{index+1}@example.com", "text": f"adjuster{index+1}@example.com"}
    
    # Storm Information - date format needs to be {"date": "YYYY-MM-DD"}
    loss_date = (datetime.now() - timedelta(days=random.randint(30, 180))).strftime("%Y-%m-%d")
    column_values["date_19__1"] = {"date": loss_date}
    
    # Property Information
    # For file fields, we can't easily create test files, so we'll leave these empty for now
    
    return item_name, column_values

def create_staff_board_item(index):
    """Create a single test item for the Sales Staff board."""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    item_name = f"{TEST_PREFIX}STAFF_{index+1}_{timestamp}"
    
    column_values = {}
    
    # Sales Staff Information
    column_values["text25"] = test_first_names[index % len(test_first_names)]
    column_values["text1"] = test_last_names[index % len(test_last_names)]
    column_values["email7"] = {
        "email": f"rm.{test_emails[index % len(test_emails)]}",
        "text": f"rm.{test_emails[index % len(test_emails)]}"
    }
    column_values["email__1"] = {
        "email": f"wra.{test_emails[index % len(test_emails)]}",
        "text": f"wra.{test_emails[index % len(test_emails)]}"
    }
    
    # Status column - Use a valid index value with special Monday.com status format
    # Convert string index back to number since we know these are valid indexes
    column_values["status_13"] = {"index": int(staff_team_names[index % len(staff_team_names)])}
    
    # For file fields, we can't easily create test files, so we'll leave these empty for now
    
    column_values["text6"] = test_shirt_sizes[index % len(test_shirt_sizes)]
    column_values["phone"] = {"phone": test_phones[index % len(test_phones)], "countryShortName": "US"}
    column_values["text"] = test_addresses[index % len(test_addresses)].split(',')[0]
    
    # City, State, Zip from address
    address_parts = test_addresses[index % len(test_addresses)].split(',')
    if len(address_parts) > 1:
        city_state_zip = address_parts[1].strip().split(' ')
        if len(city_state_zip) >= 3:
            column_values["text2"] = city_state_zip[0]  # CITY
            column_values["text5"] = city_state_zip[1]  # STATE
            column_values["text57"] = city_state_zip[2]  # ZIP
    
    return item_name, column_values

def create_items_for_board(board_id, create_item_func, num_items, board_name):
    """Create the specified number of test items for a board."""
    print(f"Creating {num_items} test items in Monday.com {board_name}...")
    
    # Store created item IDs
    created_items = []
    
    for i in range(num_items):
        item_name, column_values = create_item_func(i)
        
        try:
            print(f"Creating {board_name} item {i+1}/{num_items}: {item_name}")
            print(f"Column values: {json.dumps(column_values)[:100]}...")
            
            # Let the monday_api handle the column values formatting
            result = monday_api.create_monday_item(board_id, item_name, column_values)
            
            if result and 'data' in result and 'create_item' in result['data'] and 'id' in result['data']['create_item']:
                item_id = result['data']['create_item']['id']
                created_items.append({
                    'id': item_id,
                    'name': item_name
                })
                print(f"✅ Created item with ID: {item_id}")
            else:
                print(f"❌ Failed to create item: {json.dumps(result, indent=2)}")
        
        except Exception as e:
            print(f"❌ Error creating item {i+1}: {str(e)}")
    
    return created_items

def main():
    """Main function to create test data in Monday.com."""
    parser = argparse.ArgumentParser(description='Create test data in Monday.com boards')
    parser.add_argument('--master', type=int, default=NUM_TEST_ITEMS, 
                        help=f'Number of test items to create in Master Project board')
    parser.add_argument('--staff', type=int, default=NUM_TEST_ITEMS, 
                        help=f'Number of test items to create in Sales Staff board')
    parser.add_argument('--board', choices=['all', 'master', 'staff'], default='all',
                        help='Which board to create test data for')
    
    args = parser.parse_args()
    
    all_created_items = {}
    
    # Create items for the Master Project board
    if args.board in ['all', 'master']:
        master_items = create_items_for_board(
            MASTER_BOARD_ID, 
            create_master_board_item, 
            args.master, 
            "Master Project Board"
        )
        all_created_items["master_board"] = master_items
    
    # Create items for the Sales Staff board
    if args.board in ['all', 'staff']:
        staff_items = create_items_for_board(
            STAFF_BOARD_ID, 
            create_staff_board_item, 
            args.staff, 
            "Sales Staff Board"
        )
        all_created_items["staff_board"] = staff_items
    
    # Save the created item IDs to a file for reference
    if all_created_items:
        filename = f"test_items_{datetime.now().strftime('%Y%m%d%H%M%S')}.json"
        with open(filename, 'w') as f:
            json.dump(all_created_items, f, indent=2)
        
        print(f"\n✅ Created test items")
        print(f"📝 Item IDs saved to {filename}")
        
        # Print summary of created items
        for board, items in all_created_items.items():
            print(f"\n{board.replace('_', ' ').title()} ({len(items)} items):")
            for item in items:
                print(f"- ID: {item['id']}, Name: {item['name']}")
    else:
        print("\n❌ No items were created")

if __name__ == "__main__":
    main()
