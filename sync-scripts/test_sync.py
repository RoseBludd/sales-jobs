#!/usr/bin/env python
"""
Script to test the synchronization of Monday.com data with the updated database schema
"""
import os
import sys
from datetime import datetime
from monday_api import monday_api, MASTER_PROJECT_COLUMN_MAP, SALES_STAFF_COLUMN_MAP
from db_connector import db
from models import Project, Customer, Property, User, Team, PALaw, Insurance, Policy

def test_sync_with_new_schema():
    """
    Test syncing data with the new database schema
    """
    print("Testing synchronization with updated database schema...")
    
    # 1. First check if the tables exist and have the correct columns
    table_checks = [
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'pa_law')",
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'policies')",
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'insurances')",
        "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'link')",
        "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone')",
        "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'measurements')"
    ]
    
    for check in table_checks:
        result = db.execute_query(check)
        exists = result[0]['exists'] if result else False
        print(f"Check {check}: {'✅ Exists' if exists else '❌ Missing'}")
    
    # 2. Test creating records in the new tables
    try:
        # Create a PA/Law record
        palaw_data = {
            'name': 'Test PA/Law',
            'phone': '123-456-7890',
            'email': 'test@palaw.com'
        }
        palaw_id = PALaw.create(palaw_data)
        print(f"✅ Created PA/Law record with ID: {palaw_id}")
        
        # Create an Insurance record
        insurance_data = {
            'company_name': 'Test Insurance Co',
            'company_phone': '123-456-7890',
            'company_email': 'info@testinsurance.com',
            'adjuster_name': 'John Adjuster',
            'adjuster_phone': '987-654-3210',
            'adjuster_email': 'john@testinsurance.com'
        }
        insurance_id = Insurance.create(insurance_data)
        print(f"✅ Created Insurance record with ID: {insurance_id}")
        
        # Create a Customer for Policy
        customer_data = {
            'name': 'Test Customer',
            'email': 'test@customer.com',
            'phone': '555-123-4567'
        }
        customer_id = Customer.create(customer_data)
        print(f"✅ Created Customer record with ID: {customer_id}")
        
        # Create a Policy record
        policy_data = {
            'customer_id': customer_id,
            'policy_number': 'POL12345',
            'insurance_id': insurance_id,
            'status': 'active'
        }
        policy_id = Policy.create(policy_data)
        print(f"✅ Created Policy record with ID: {policy_id}")
        
        # Update Project record with new fields
        property_data = {
            'customer_id': customer_id,
            'street': '123 Test St',
            'city': 'Test City',
            'state': 'TX',
            'zip': '12345'
        }
        property_id = Property.create(property_data)
        
        project_data = {
            'name': 'Test Project',
            'description': 'Test Description',
            'property_id': property_id,
            'link': 'https://test-link.com',
            'company_cam_link': 'https://test-companycam.com',
            'total_payment': 1000.00
        }
        project_id = Project.create(project_data)
        print(f"✅ Created Project record with ID: {project_id}")
        
        print("\nAll test records created successfully!")
        
    except Exception as e:
        print(f"❌ Error during testing: {str(e)}")
        
    print("\nTest completed.")

if __name__ == "__main__":
    test_sync_with_new_schema()
