import os
import sys
import json
import re
import time
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from monday_api import monday_api, MASTER_PROJECT_COLUMN_MAP, SALES_STAFF_COLUMN_MAP
from db_connector import db
from models import Project, Customer, Property, Note, User, Team, PALaw, Insurance, Policy
from timing import TimingStats, timed_operation
from data_cache import list_cached_data

# Board IDs from environment variables
BOARD_ID_USERS = os.environ.get('MONDAY_BOARD_ID_USERS', '5764059860')
BOARD_ID_DATA = os.environ.get('MONDAY_BOARD_ID_DATA', '6727219152')

def parse_address(address_str):
    """Parse an address string into components.
    
    Args:
        address_str (str): Address string to parse
        
    Returns:
        dict: Dictionary with address components
    """
    parts = {
        'street': '',
        'city': '',
        'state': '',
        'zip': ''
    }
    
    if not address_str:
        return parts
    
    # Split by commas and newlines
    lines = re.split(r'[\n,]+', address_str)
    lines = [line.strip() for line in lines if line.strip()]
    
    if not lines:
        return parts
    
    # First line is typically the street address
    parts['street'] = lines[0]
    
    # Parse city, state, zip from remaining lines
    if len(lines) > 1:
        for line in lines[1:]:
            # Look for state abbreviation followed by zip code
            state_zip_match = re.search(r'([A-Za-z]+)[,\s]+([A-Za-z]{2})[,\s]+(\d{5}(?:-\d{4})?)', line)
            if state_zip_match:
                parts['city'] = state_zip_match.group(1)
                parts['state'] = state_zip_match.group(2)
                parts['zip'] = state_zip_match.group(3)
                break
            
            # Just state and zip
            state_zip_match = re.search(r'([A-Za-z]{2})[,\s]+(\d{5}(?:-\d{4})?)', line)
            if state_zip_match:
                parts['state'] = state_zip_match.group(1)
                parts['zip'] = state_zip_match.group(2)
                
                # If we haven't found city yet, look in previous line
                if not parts['city'] and len(lines) > 2:
                    parts['city'] = lines[1]
                break
    
    return parts

def map_monday_status_to_project_status(monday_status):
    """Map Monday.com status to valid project_status enum value.
    
    Args:
        monday_status (str): Status from Monday.com
        
    Returns:
        str: Valid project_status enum value (pending, active, completed, cancelled)
    """
    status_map = {
        # Common Monday.com status values mapped to valid project_status values
        'New': 'pending',
        'In Progress': 'active',
        'Done': 'completed',
        'Cancelled': 'cancelled',
        'Hold': 'pending',
        'Waiting': 'pending',
        'Working': 'active',
        'Completed': 'completed',
        'Approved': 'completed',
        'Rejected': 'cancelled'
    }
    
    # Default to 'pending' if no match is found
    return status_map.get(monday_status, 'pending')

def sync_sales_staff(limit=None, batch_size=50, use_cache=False, cache_file=None):
    """Sync sales staff (users) from Monday.com to PostgreSQL.
    
    Args:
        limit (int, optional): Limit the number of users to sync. Defaults to None (all users).
        batch_size (int, optional): Number of users to process in each batch. Defaults to 50.
        use_cache (bool, optional): Whether to use cached data if available. Defaults to False.
        cache_file (str, optional): Specific cache file to use. Defaults to None (use latest).
    """
    process_name = f"sync_sales_staff_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    timing_stats = TimingStats(process_name)
    
    print('🔄 Syncing Sales Staff from Monday.com to PostgreSQL...')
    start_time = time.time()
    
    try:
        # Get only the column IDs we need
        column_ids = list(SALES_STAFF_COLUMN_MAP.keys())
        
        # Fetch all items from the Sales Staff Board
        with timed_operation(timing_stats, "fetch_monday_data"):
            sales_staff_items = monday_api.fetch_all_board_items(
                BOARD_ID_USERS, 
                use_cache=use_cache,
                cache_filename=cache_file,
                column_ids=column_ids
            )
        
        # Apply limit if specified
        if limit and limit > 0:
            sales_staff_items = sales_staff_items[:limit]
            print(f"Limited to {limit} sales staff items")
        
        print(f"Found {len(sales_staff_items)} sales staff items to sync")
        
        # Process each sales staff item
        successful_syncs = 0
        skipped_items = 0
        error_count = 0
        
        # Process items in batches
        total_items = len(sales_staff_items)
        
        with timed_operation(timing_stats, "process_all_batches"):
            for batch_start in range(0, total_items, batch_size):
                batch_end = min(batch_start + batch_size, total_items)
                batch = sales_staff_items[batch_start:batch_end]
                batch_number = batch_start//batch_size + 1
                total_batches = (total_items + batch_size - 1)//batch_size
                
                print(f"Processing batch {batch_number}/{total_batches} ({batch_start}-{batch_end-1} of {total_items})")
                batch_start_time = time.time()
                
                # Process the batch
                with timed_operation(timing_stats, f"process_batch_{batch_number}"):
                    for item in batch:
                        monday_id = item['id']
                        
                        # Extract data from Monday.com
                        user_data = {
                            'name': '',
                            'email': '',
                            'role': 'sales_agent',  # Default role
                            'department': 'Sales',  # Default department
                            'monday_id': monday_id,
                            'monday_account_id': item.get('creator_id'),
                            'monday_title': 'Sales Staff',
                            'monday_team': None,
                            'metadata': {}
                        }
                        
                        # Extract basic fields
                        first_name = ''
                        last_name = ''
                        metadata = {
                            'phone': '',
                            'street': '',
                            'city': '',
                            'state': '',
                            'zip': '',
                            'shirt_size': ''
                        }
                        team_name = None
                        
                        # Extract column values
                        for column in item['column_values']:
                            column_id = column['id']
                            column_value = column['text']
                            column_title = column.get('title', '')
                            
                            # Map column values to user data
                            if column_id in SALES_STAFF_COLUMN_MAP:
                                field_name = SALES_STAFF_COLUMN_MAP[column_id]
                                
                                if field_name == 'first_name':
                                    first_name = column_value
                                elif field_name == 'last_name':
                                    last_name = column_value
                                elif field_name == 'email':
                                    user_data['email'] = column_value
                                elif field_name == 'phone':
                                    metadata['phone'] = column_value
                                elif field_name == 'street' and column_value:
                                    # Parse address into components
                                    address_parts = parse_address(column_value)
                                    metadata['street'] = address_parts['street']
                                    metadata['city'] = address_parts['city'] or metadata['city']
                                    metadata['state'] = address_parts['state'] or metadata['state']
                                    metadata['zip'] = address_parts['zip'] or metadata['zip']
                                elif field_name == 'city':
                                    metadata['city'] = column_value
                                elif field_name == 'state':
                                    metadata['state'] = column_value
                                elif field_name == 'zip':
                                    metadata['zip'] = column_value
                                elif field_name == 'shirt_size':
                                    metadata['shirt_size'] = column_value
                                elif field_name == 'team_name':
                                    team_name = column_value
                                    user_data['monday_team'] = column_value
                            else:
                                # Store unmapped columns in metadata
                                metadata[column_title or column_id] = column_value
                        
                        # Set name by combining first and last name
                        user_data['name'] = f"{first_name} {last_name}".strip()
                        
                        # Skip if both name and email are empty (likely an incomplete or test record)
                        if not user_data['name'] and not user_data['email']:
                            skipped_items += 1
                            continue
                        
                        # Skip users with empty emails to avoid unique constraint violations
                        if not user_data['email']:
                            skipped_items += 1
                            db.log_sync_operation('user', monday_id, 'skip', 'warning', 'Empty email address')
                            print(f"⚠️ Skipped user with empty email: {user_data.get('name') or monday_id}")
                            continue
                        
                        # Add metadata to user data
                        user_data['metadata'] = metadata
                        
                        # Get or create team if team_name is provided
                        if team_name:
                            # Just check if team exists
                            team = Team.get_by_name(team_name)
                            if not team:
                                # Create the team if it doesn't exist
                                Team.create({'name': team_name})
                        
                        try:
                            # Check if we already have a mapping for this Monday.com item
                            system_id = db.get_system_id('user', monday_id)
                            
                            # Create or update user
                            if system_id:
                                # Update existing user
                                User.update(system_id, user_data)
                                db.log_sync_operation('user', monday_id, 'update', 'success')
                                print(f"✅ Updated user: {user_data.get('name')}")
                                successful_syncs += 1
                            else:
                                # Check if user exists by email
                                existing_user = User.get_by_email(user_data['email'])
                                
                                if existing_user:
                                    # Update existing user found by email
                                    User.update(existing_user['id'], user_data)
                                    db.add_sync_mapping('user', existing_user['id'], monday_id)
                                    db.log_sync_operation('user', monday_id, 'update', 'success')
                                    print(f"✅ Updated user by email: {user_data.get('name')}")
                                    successful_syncs += 1
                                else:
                                    # Create new user
                                    user_id = User.create(user_data)
                                    if user_id:
                                        db.add_sync_mapping('user', user_id, monday_id)
                                        db.log_sync_operation('user', monday_id, 'create', 'success')
                                        print(f"✅ Created new user: {user_data.get('name')}")
                                        successful_syncs += 1
                        
                        except Exception as e:
                            error_count += 1
                            db.log_sync_operation('user', monday_id, 'update' if system_id else 'create', 'error', str(e))
                            print(f"❌ Error syncing user {monday_id}: {str(e)}")
                
                # Print batch summary with timing
                batch_duration = time.time() - batch_start_time
                print(f"Batch {batch_number} complete in {batch_duration:.2f}s: {successful_syncs} successful, {skipped_items} skipped, {error_count} errors so far")
        
        # Save timing stats
        stats_file = timing_stats.save_to_file()
        
        # Calculate total duration
        total_duration = time.time() - start_time
        
        print(f"✅ Sales staff sync completed in {total_duration:.2f}s: {successful_syncs} successful, {skipped_items} skipped, {error_count} errors")
        print(f"📊 Timing statistics saved to: {stats_file}")
        
        return True
    
    except Exception as e:
        print(f"❌ Error in sales staff sync: {str(e)}")
        # Still save timing stats even if there was an error
        timing_stats.save_to_file()
        return False

def test_sync_limited_users(limit=10, use_cache=True):
    """Sync only a limited number of users for testing.
    
    Args:
        limit (int, optional): Number of users to sync. Defaults to 10.
        use_cache (bool, optional): Whether to use cached data if available. Defaults to True.
    """
    print(f'🔄 Test syncing up to {limit} users from Monday.com...')
    
    # Just call the main sync function with a limit
    return sync_sales_staff(limit=limit, use_cache=use_cache)

def test_sync_limited_projects(limit=10, use_cache=True, cache_file=None, max_pages=1):
    """Sync only a limited number of projects for testing.
    
    Args:
        limit (int, optional): Number of projects to sync. Defaults to 10.
        use_cache (bool, optional): Whether to use cached data if available. Defaults to True.
        cache_file (str, optional): Specific cache file to use. Defaults to None (use latest).
        max_pages (int, optional): Maximum number of pages to fetch. Defaults to 1.
    """
    print(f"🔄 Test syncing up to {limit} projects from Monday.com (max_pages={max_pages})...")
    sync_projects(limit=limit, use_cache=use_cache, cache_file=cache_file, max_pages=max_pages)

def sync_projects(limit=None, batch_size=50, use_cache=False, cache_file=None, max_pages=None):
    """Sync projects from Monday.com to PostgreSQL.
    
    Args:
        limit (int, optional): Limit the number of projects to sync. Defaults to None (all projects).
        batch_size (int, optional): Number of projects to process in each batch. Defaults to 50.
        use_cache (bool, optional): Whether to use cached data if available. Defaults to False.
        cache_file (str, optional): Specific cache file to use. Defaults to None (use latest).
        max_pages (int, optional): Maximum number of pages to fetch. Defaults to None (all pages).
    """
    print('🔄 Syncing Projects from Monday.com to PostgreSQL...')
    
    try:
        # Get only the column IDs we need
        column_ids = list(MASTER_PROJECT_COLUMN_MAP.keys())
        
        # Fetch all items from the Master Project Board
        project_items = monday_api.fetch_all_board_items(
            BOARD_ID_DATA, 
            use_cache=use_cache, 
            cache_filename=cache_file,
            column_ids=column_ids,
            max_pages=max_pages
        )
        
        # Apply limit if specified
        if limit and limit > 0:
            project_items = project_items[:limit]
            print(f"Limited to {limit} project items")
        
        print(f"Found {len(project_items)} project items to sync")
        
        # Process each project item
        for item in project_items:
            monday_id = item['id']
            
            # Check if we already have a mapping for this Monday.com item
            system_id = db.get_system_id('project', monday_id)
            
            # Extract data from Monday.com
            project_data = {
                'name': item['name'],
                'description': '',
                'property_id': None,
                'estimated_value': '',
                'status': 'pending',
                'phase': 'pre-sale',
                'production_status': 'not_started'
            }
            
            customer_data = {
                'name': '',
                'email': '',
                'phone': ''
            }
            
            property_data = {
                'customer_id': None,
                'street': '',
                'city': '',
                'state': '',
                'zip': '',
                'type': 'residential',
                'square_footage': None,
                'year_built': None,
                'roof_type': '',
                'last_inspection': None,
                'status': 'pending',
                'notes': '',
                'damage_info': ''
            }
            
            note_content = ''
            
            # Extract column values
            for column in item['column_values']:
                column_id = column['id']
                column_value = column['text']
                
                # Map column values to appropriate data structure
                if column_id in MASTER_PROJECT_COLUMN_MAP:
                    field_name = MASTER_PROJECT_COLUMN_MAP[column_id]
                    
                    # Handle customer data
                    if field_name in ['name', 'email', 'phone']:
                        customer_data[field_name] = column_value
                    
                    # Handle address parsing
                    elif field_name == 'street' and column_value:
                        address_parts = parse_address(column_value)
                        # Update property data only
                        property_data['street'] = address_parts['street']
                        property_data['city'] = address_parts['city']
                        property_data['state'] = address_parts['state']
                        property_data['zip'] = address_parts['zip']
                    
                    # Handle note content
                    elif field_name == 'customer_note':
                        note_content = column_value
                    
                    # Skip fields that don't exist in the database
                    elif field_name in ['job_progress_link', 'job_progress_name', 'company_cam_link', 'total_payment']:
                        pass
                    
                    # Handle project fields that exist in the database
                    elif field_name in ['description', 'estimated_value']:
                        project_data[field_name] = column_value
                    elif field_name == 'status':
                        project_data[field_name] = map_monday_status_to_project_status(column_value)
            
            try:
                # Transaction handling
                if system_id:
                    # Update existing project
                    Project.update(system_id, project_data)
                    
                    # Get associated customer and property
                    project_record = Project.get_by_id(system_id)
                    if project_record and project_record.get('customer_id'):
                        Customer.update(project_record['customer_id'], customer_data)
                        
                        # Update property if customer has one
                        property_records = db.execute_query(
                            "SELECT id FROM properties WHERE customer_id = %s LIMIT 1", 
                            (project_record['customer_id'],)
                        )
                        
                        if property_records:
                            property_data['customer_id'] = project_record['customer_id']
                            Property.update(property_records[0]['id'], property_data)
                    
                    db.log_sync_operation('project', monday_id, 'update', 'success')
                    print(f"✅ Updated project: {project_data['name']}")
                else:
                    # Create new project and related entities
                    
                    # First check if customer exists by email
                    customer_id = None
                    if customer_data.get('email'):
                        customer_id = Customer.find_by_email(customer_data['email'])
                    
                    # If no email or customer not found by email, either create new or update existing
                    if not customer_id:
                        # Generate a placeholder email if none exists to avoid unique constraint violations
                        if not customer_data.get('email'):
                            # Use name + random string to create a unique placeholder email
                            import uuid
                            random_suffix = str(uuid.uuid4())[:8]
                            name_part = customer_data.get('name', 'unknown').lower().replace(' ', '_')
                            customer_data['email'] = f"{name_part}_{random_suffix}@placeholder.example"
                        
                        # Create new customer
                        customer_id = Customer.create(customer_data)
                    
                    # Create property linked to customer
                    property_data['customer_id'] = customer_id
                    property_id = Property.create(property_data)
                    
                    # Create project linked to customer
                    project_data['customer_id'] = customer_id
                    project_data['property_id'] = property_id
                    project_id = Project.create(project_data)
                    
                    # Create note if there's content
                    if note_content:
                        Note.create({
                            'content': note_content,
                            'customer_id': customer_id,
                            'project_id': project_id,
                            'property_id': property_id
                        })
                    
                    # Add mapping for the new project
                    db.add_sync_mapping('project', project_id, monday_id)
                    db.log_sync_operation('project', monday_id, 'create', 'success')
                    print(f"✅ Created new project: {project_data['name']}")
            
            except Exception as e:
                db.log_sync_operation('project', monday_id, 'update' if system_id else 'create', 'error', str(e))
                print(f"❌ Error syncing project {monday_id}: {str(e)}")
        
        print("✅ Projects sync completed")
        return True
    
    except Exception as e:
        print(f"❌ Error in projects sync: {str(e)}")
        return False

def list_cache_files():
    """List all cached data files."""
    cached_data = list_cached_data()
    
    if not cached_data:
        print("No cached data files found.")
        return
    
    print("\n📁 Cached Data Files:")
    print("=====================")
    
    for idx, cache in enumerate(cached_data, 1):
        filename = cache.get('filename', 'unknown')
        board_id = cache.get('board_id', 'unknown')
        timestamp = cache.get('timestamp', 'unknown')
        item_count = cache.get('item_count', 'unknown')
        cached_at = cache.get('cached_at', 'unknown')
        
        if board_id == BOARD_ID_USERS:
            board_type = "Users"
        elif board_id == BOARD_ID_DATA:
            board_type = "Projects"
        else:
            board_type = f"Board {board_id}"
        
        print(f"{idx}. {board_type}: {item_count} items - {timestamp}")
        print(f"   Filename: {filename}")
    
    print("\nTo use a cached file, run with the --use-cache option and specify the filename with --cache-file")
    print("Example: python sync_monday_to_pg.py --users --use-cache --cache-file monday_board_5764059860_20250228_010203.json")

def main():
    print("🚀 Starting Monday.com to PostgreSQL synchronization")
    
    # Add simple argument parsing
    if len(sys.argv) > 1:
        # First check for cache listing command
        if sys.argv[1] == '--list-cache':
            list_cache_files()
            sys.exit(0)
        
        # Parse use_cache and cache_file options
        use_cache = '--use-cache' in sys.argv
        cache_file = None
        
        for i, arg in enumerate(sys.argv):
            if arg == '--cache-file' and i+1 < len(sys.argv):
                cache_file = sys.argv[i+1]
        
        if sys.argv[1] == '--test':
            # Get test limit if provided
            limit = 10
            for i, arg in enumerate(sys.argv):
                if arg == '--limit' and i+1 < len(sys.argv) and sys.argv[i+1].isdigit():
                    limit = int(sys.argv[i+1])
            
            print(f"Running test sync with limit of {limit} users")
            test_sync_limited_users(limit, use_cache=use_cache)
            sys.exit(0)
        elif sys.argv[1] == '--test-projects':
            # Get test limit if provided
            limit = 10
            for i, arg in enumerate(sys.argv):
                if arg == '--limit' and i+1 < len(sys.argv) and sys.argv[i+1].isdigit():
                    limit = int(sys.argv[i+1])
            
            print(f"Running test sync with limit of {limit} projects")
            test_sync_limited_projects(limit, use_cache=use_cache, cache_file=cache_file)
            sys.exit(0)
        elif sys.argv[1] == '--users':
            limit = None
            for i, arg in enumerate(sys.argv):
                if arg == '--limit' and i+1 < len(sys.argv) and sys.argv[i+1].isdigit():
                    limit = int(sys.argv[i+1])
            
            try:
                db.connect()
                db.create_sync_mapping_table()
                db.create_sync_logs_table()
                sync_sales_staff(limit=limit, use_cache=use_cache, cache_file=cache_file)
            finally:
                db.disconnect()
            sys.exit(0)
        elif sys.argv[1] == '--projects':
            limit = None
            for i, arg in enumerate(sys.argv):
                if arg == '--limit' and i+1 < len(sys.argv) and sys.argv[i+1].isdigit():
                    limit = int(sys.argv[i+1])
            
            try:
                db.connect()
                db.create_sync_mapping_table()
                db.create_sync_logs_table()
                sync_projects(limit=limit, use_cache=use_cache, cache_file=cache_file)
            finally:
                db.disconnect()
            sys.exit(0)
    
    # Ensure database connection
    try:
        db.connect()
        
        # Ensure required tables exist
        db.create_sync_mapping_table()
        db.create_sync_logs_table()
        
        # Run the sync processes
        sync_sales_staff()
        sync_projects()
        
        print("✅ Synchronization completed successfully")
        
    except Exception as e:
        print(f"❌ Error during synchronization: {str(e)}")
        sys.exit(1)
    finally:
        db.disconnect()

if __name__ == "__main__":
    main()
