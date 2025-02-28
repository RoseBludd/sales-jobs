import os
import sys
import json
from typing import Dict, List, Any
from monday_api import monday_api, MASTER_PROJECT_COLUMN_MAP, SALES_STAFF_COLUMN_MAP
from db_connector import db
from models import Project, Customer, Property, User, Team

# Board IDs from environment variables
BOARD_ID_USERS = os.environ.get('MONDAY_BOARD_ID_USERS', '5764059860')
BOARD_ID_DATA = os.environ.get('MONDAY_BOARD_ID_DATA', '6727219152')

def reverse_map(mapping: Dict[str, str]) -> Dict[str, str]:
    """Reverse a column mapping dictionary."""
    return {v: k for k, v in mapping.items()}

# Reverse mappings for updating Monday.com
REVERSE_PROJECT_MAP = reverse_map(MASTER_PROJECT_COLUMN_MAP)
REVERSE_USER_MAP = reverse_map(SALES_STAFF_COLUMN_MAP)

def format_address(street: str, city: str, state: str, zip_code: str) -> str:
    """Format address components into a single string."""
    components = []
    if street:
        components.append(street)
    
    location_parts = []
    if city:
        location_parts.append(city)
    if state:
        location_parts.append(state)
    
    location = ", ".join(location_parts)
    if location:
        components.append(location)
    
    if zip_code:
        components.append(zip_code)
    
    return ", ".join(components)

def sync_users_to_monday():
    """Sync users from PostgreSQL to Monday.com."""
    print('🔄 Syncing Users from PostgreSQL to Monday.com...')
    
    try:
        # Get all users with sales_staff role that have been updated recently
        query = """
        SELECT u.*, t.name as team_name
        FROM users u
        LEFT JOIN teams t ON u.team_id = t.id
        WHERE u.role = 'sales_staff'
        ORDER BY u.updated_at DESC
        """
        
        users = db.execute_query(query)
        print(f"Found {len(users)} users to sync")
        
        for user in users:
            user_id = user['id']
            
            # Check if we have a Monday.com mapping for this user
            monday_id = db.get_monday_id('user', user_id)
            
            # Prepare column values for Monday.com
            column_values = {}
            
            # Map PostgreSQL fields to Monday.com columns
            for field, value in user.items():
                if field in REVERSE_USER_MAP:
                    column_id = REVERSE_USER_MAP[field]
                    
                    # Skip None values
                    if value is not None:
                        column_values[column_id] = str(value)
            
            # Special handling for address
            address = format_address(
                user.get('address', ''),
                user.get('city', ''),
                user.get('state', ''),
                user.get('zip', '')
            )
            
            if address and 'address' in REVERSE_USER_MAP:
                column_values[REVERSE_USER_MAP['address']] = address
            
            # Set team name if available
            if user.get('team_name') and 'team_name' in REVERSE_USER_MAP:
                column_values[REVERSE_USER_MAP['team_name']] = user['team_name']
            
            try:
                if monday_id:
                    # Update existing Monday.com item
                    for column_id, value in column_values.items():
                        monday_api.update_monday_item(BOARD_ID_USERS, monday_id, column_id, value)
                    
                    db.log_sync_operation('user', monday_id, 'update', 'success')
                    print(f"✅ Updated user in Monday.com: {user.get('first_name')} {user.get('last_name')}")
                else:
                    # Create new Monday.com item
                    item_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
                    if not item_name:
                        item_name = user.get('email', 'New User')
                    
                    result = monday_api.create_monday_item(BOARD_ID_USERS, item_name, column_values)
                    new_monday_id = result.get('data', {}).get('create_item', {}).get('id')
                    
                    if new_monday_id:
                        db.add_sync_mapping('user', user_id, new_monday_id)
                        db.log_sync_operation('user', new_monday_id, 'create', 'success')
                        print(f"✅ Created user in Monday.com: {item_name}")
                    else:
                        raise Exception("Failed to get new item ID from Monday.com")
            
            except Exception as e:
                status = 'update' if monday_id else 'create'
                db.log_sync_operation('user', monday_id or 'unknown', status, 'error', str(e))
                print(f"❌ Error syncing user {user_id} to Monday.com: {str(e)}")
        
        print("✅ Users sync to Monday.com completed")
        return True
    
    except Exception as e:
        print(f"❌ Error in users sync to Monday.com: {str(e)}")
        return False

def sync_projects_to_monday():
    """Sync projects from PostgreSQL to Monday.com."""
    print('🔄 Syncing Projects from PostgreSQL to Monday.com...')
    
    try:
        # Get all projects with their related customer and property data
        query = """
        SELECT 
            p.id, p.name, p.job_progress_link, p.job_progress_name, p.job_progress_description,
            p.company_cam_link, p.total_price, p.total_payment, p.current_stage,
            c.id as customer_id, c.full_name, c.email, c.phone,
            prop.id as property_id, prop.street, prop.city, prop.state, prop.zip,
            prop.measurements, prop.one_click_codes,
            n.content as customer_note
        FROM projects p
        LEFT JOIN customers c ON p.customer_id = c.id
        LEFT JOIN properties prop ON c.id = prop.customer_id
        LEFT JOIN notes n ON p.id = n.project_id
        ORDER BY p.updated_at DESC
        """
        
        projects = db.execute_query(query)
        print(f"Found {len(projects)} projects to sync")
        
        for project in projects:
            project_id = project['id']
            
            # Check if we have a Monday.com mapping for this project
            monday_id = db.get_monday_id('project', project_id)
            
            # Prepare column values for Monday.com
            column_values = {}
            
            # Map PostgreSQL project fields to Monday.com columns
            for field, value in project.items():
                if field in REVERSE_PROJECT_MAP:
                    column_id = REVERSE_PROJECT_MAP[field]
                    
                    # Skip None values
                    if value is not None:
                        column_values[column_id] = str(value)
            
            # Special handling for customer fields
            if project.get('full_name') and 'full_name' in REVERSE_PROJECT_MAP:
                column_values[REVERSE_PROJECT_MAP['full_name']] = project['full_name']
            
            if project.get('email') and 'email' in REVERSE_PROJECT_MAP:
                column_values[REVERSE_PROJECT_MAP['email']] = project['email']
            
            if project.get('phone') and 'phone' in REVERSE_PROJECT_MAP:
                column_values[REVERSE_PROJECT_MAP['phone']] = project['phone']
            
            # Format full address from components
            address = format_address(
                project.get('street', ''),
                project.get('city', ''),
                project.get('state', ''),
                project.get('zip', '')
            )
            
            if address and 'address' in REVERSE_PROJECT_MAP:
                column_values[REVERSE_PROJECT_MAP['address']] = address
            
            # Add property specific fields
            if project.get('measurements') and 'measurements' in REVERSE_PROJECT_MAP:
                column_values[REVERSE_PROJECT_MAP['measurements']] = project['measurements']
            
            if project.get('one_click_codes') and 'one_click_codes' in REVERSE_PROJECT_MAP:
                column_values[REVERSE_PROJECT_MAP['one_click_codes']] = project['one_click_codes']
            
            # Add customer note
            if project.get('customer_note') and 'customer_note' in REVERSE_PROJECT_MAP:
                column_values[REVERSE_PROJECT_MAP['customer_note']] = project['customer_note']
            
            try:
                if monday_id:
                    # Update existing Monday.com item
                    for column_id, value in column_values.items():
                        monday_api.update_monday_item(BOARD_ID_DATA, monday_id, column_id, value)
                    
                    db.log_sync_operation('project', monday_id, 'update', 'success')
                    print(f"✅ Updated project in Monday.com: {project.get('name')}")
                else:
                    # Create new Monday.com item
                    item_name = project.get('name') or f"Project for {project.get('full_name', 'Unknown Customer')}"
                    
                    result = monday_api.create_monday_item(BOARD_ID_DATA, item_name, column_values)
                    new_monday_id = result.get('data', {}).get('create_item', {}).get('id')
                    
                    if new_monday_id:
                        db.add_sync_mapping('project', project_id, new_monday_id)
                        db.log_sync_operation('project', new_monday_id, 'create', 'success')
                        print(f"✅ Created project in Monday.com: {item_name}")
                    else:
                        raise Exception("Failed to get new item ID from Monday.com")
            
            except Exception as e:
                status = 'update' if monday_id else 'create'
                db.log_sync_operation('project', monday_id or 'unknown', status, 'error', str(e))
                print(f"❌ Error syncing project {project_id} to Monday.com: {str(e)}")
        
        print("✅ Projects sync to Monday.com completed")
        return True
    
    except Exception as e:
        print(f"❌ Error in projects sync to Monday.com: {str(e)}")
        return False

def main():
    print("🚀 Starting PostgreSQL to Monday.com synchronization")
    
    # Ensure database connection
    try:
        db.connect()
        
        # Ensure required tables exist
        db.create_sync_mapping_table()
        db.create_sync_logs_table()
        
        # Run the sync processes
        sync_users_to_monday()
        sync_projects_to_monday()
        
        print("✅ Synchronization completed successfully")
        
    except Exception as e:
        print(f"❌ Error during synchronization: {str(e)}")
        sys.exit(1)
    finally:
        db.disconnect()

if __name__ == "__main__":
    main()
