from typing import Dict, List, Any, Optional
from db_connector import db
import json

class Project:
    @staticmethod
    def create(data: Dict[str, Any]) -> str:
        """Create a new project record."""
        query = """
        INSERT INTO projects (
            name, description, property_id, estimated_value, status, 
            phase, production_status, link, company_cam_link, total_payment
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """
        
        # Convert None or empty values to appropriate defaults
        # Also convert string value 'None' to actual None for database
        params = (
            data.get('name'),
            data.get('description', '') or '',  # Empty string if None or empty
            data.get('property_id'),
            data.get('estimated_value') if data.get('estimated_value') not in (None, 'None', '') else None,
            data.get('status', 'pending') or 'pending',  # Default to 'pending' if empty
            data.get('phase', 'pre-sale') or 'pre-sale',  # Default to 'pre-sale' if empty
            data.get('production_status', 'not_started') or 'not_started',  # Default to 'not_started' if empty
            data.get('link'),
            data.get('company_cam_link'),
            data.get('total_payment') if data.get('total_payment') not in (None, 'None', '') else None
        )
        
        try:
            result = db.execute_query(query, params)
            return result[0]['id'] if result else None
        except Exception as e:
            print(f"Error in Project.create: {str(e)}")
            print(f"Data: {data}")
            print(f"Params: {params}")
            raise
    
    @staticmethod
    def update(project_id: str, data: Dict[str, Any]) -> bool:
        """Update an existing project record."""
        query = """
        UPDATE projects SET
            name = COALESCE(%s, name),
            description = COALESCE(%s, description),
            property_id = COALESCE(%s, property_id),
            estimated_value = COALESCE(%s, estimated_value),
            status = COALESCE(%s, status),
            phase = COALESCE(%s, phase),
            production_status = COALESCE(%s, production_status),
            updated_at = NOW()
        WHERE id = %s
        """
        
        # Convert None or empty values to appropriate defaults
        # Also convert string value 'None' to actual None for database
        params = (
            data.get('name'),
            data.get('description', '') or '',  # Empty string if None or empty
            data.get('property_id'),
            data.get('estimated_value', data.get('total_price')) if data.get('estimated_value', data.get('total_price')) not in (None, 'None', '') else None,
            data.get('status', 'pending') or 'pending',  # Default to 'pending' if empty
            data.get('phase', 'pre-sale') or 'pre-sale',  # Default to 'pre-sale' if empty
            data.get('production_status', 'not_started') or 'not_started',  # Default to 'not_started' if empty
            project_id
        )
        
        try:
            db.execute_query(query, params)
            return True
        except Exception as e:
            print(f"Error in Project.update: {str(e)}")
            print(f"Data: {data}")
            print(f"Params: {params}")
            raise
    
    @staticmethod
    def get_by_id(project_id: str) -> Dict[str, Any]:
        """Get a project by ID."""
        query = """
        SELECT * FROM projects WHERE id = %s
        """
        
        result = db.execute_query(query, (project_id,))
        return result[0] if result else None
    
    @staticmethod
    def get_all() -> List[Dict[str, Any]]:
        """Get all projects."""
        query = """
        SELECT * FROM projects
        """
        
        return db.execute_query(query)

class Customer:
    @staticmethod
    def create(data: Dict[str, Any]) -> str:
        """Create a new customer record."""
        query = """
        INSERT INTO customers (
            name, email, phone
        ) VALUES (%s, %s, %s)
        RETURNING id
        """
        
        params = (
            data.get('name'),
            data.get('email'),
            data.get('phone')
        )
        
        result = db.execute_query(query, params)
        return result[0]['id'] if result else None
    
    @staticmethod
    def update(customer_id: str, data: Dict[str, Any]) -> bool:
        """Update an existing customer record."""
        query = """
        UPDATE customers SET
            name = COALESCE(%s, name),
            email = COALESCE(%s, email),
            phone = COALESCE(%s, phone),
            updated_at = NOW()
        WHERE id = %s
        """
        
        params = (
            data.get('name'),
            data.get('email'),
            data.get('phone'),
            customer_id
        )
        
        db.execute_query(query, params)
        return True
    
    @staticmethod
    def get_by_id(customer_id: str) -> Dict[str, Any]:
        """Get a customer by ID."""
        query = """
        SELECT * FROM customers WHERE id = %s
        """
        
        result = db.execute_query(query, (customer_id,))
        return result[0] if result else None
    
    @staticmethod
    def find_by_email(email: str) -> str:
        """Find a customer by email.
        
        Args:
            email (str): Email to search for
            
        Returns:
            str: Customer ID if found, None otherwise
        """
        query = """
        SELECT id FROM customers WHERE email = %s
        """
        result = db.execute_query(query, (email,))
        if result and len(result) > 0:
            return result[0]['id']
        return None

class Property:
    @staticmethod
    def create(data: Dict[str, Any]) -> str:
        """Create a new property record."""
        query = """
        INSERT INTO properties (
            customer_id, street, city, state, zip, 
            type, square_footage, year_built, roof_type, 
            status, notes, damage_info, measurements, one_click_codes
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """
        
        # Default values for optional fields
        damage_info = data.get('damage_info')
        if damage_info and isinstance(damage_info, str):
            try:
                damage_info = json.loads(damage_info)
            except:
                damage_info = {}
        elif not damage_info:
            damage_info = {}
            
        measurements = data.get('measurements')
        if measurements and isinstance(measurements, str):
            try:
                measurements = json.loads(measurements)
            except:
                measurements = {}
        elif not measurements:
            measurements = {}
            
        one_click_codes = data.get('one_click_codes')
        if one_click_codes and isinstance(one_click_codes, str):
            try:
                one_click_codes = json.loads(one_click_codes)
            except:
                one_click_codes = {}
        elif not one_click_codes:
            one_click_codes = {}
        
        params = (
            data.get('customer_id'),
            data.get('street', ''),
            data.get('city', ''),
            data.get('state', ''),
            data.get('zip', ''),
            data.get('type', 'residential'),
            data.get('square_footage'),
            data.get('year_built'),
            data.get('roof_type', ''),
            data.get('status', 'active'),
            data.get('notes', ''),
            json.dumps(damage_info),
            json.dumps(measurements),
            json.dumps(one_click_codes)
        )
        
        try:
            result = db.execute_query(query, params)
            return result[0]['id'] if result else None
        except Exception as e:
            print(f"Error in Property.create: {str(e)}")
            print(f"Data: {data}")
            print(f"Params: {params}")
            raise
    
    @staticmethod
    def update(property_id: str, data: Dict[str, Any]) -> bool:
        """Update an existing property record."""
        query = """
        UPDATE properties SET
            customer_id = COALESCE(%s, customer_id),
            street = COALESCE(%s, street),
            city = COALESCE(%s, city),
            state = COALESCE(%s, state),
            zip = COALESCE(%s, zip),
            type = COALESCE(%s, type),
            square_footage = COALESCE(%s, square_footage),
            year_built = COALESCE(%s, year_built),
            roof_type = COALESCE(%s, roof_type),
            status = COALESCE(%s, status),
            notes = COALESCE(%s, notes),
            damage_info = COALESCE(%s, damage_info),
            updated_at = NOW()
        WHERE id = %s
        """
        
        params = (
            data.get('customer_id'),
            data.get('street', ''),
            data.get('city', ''),
            data.get('state', ''),
            data.get('zip', ''),
            data.get('type', 'residential'),  # Default to 'residential' for property type
            data.get('square_footage'),
            data.get('year_built'),
            data.get('roof_type', ''),
            data.get('status', 'pending'),  # Default to 'pending' for property status
            data.get('notes', ''),
            data.get('damage_info', ''),
            property_id
        )
        
        db.execute_query(query, params)
        return True
    
    @staticmethod
    def get_by_id(property_id: str) -> Dict[str, Any]:
        """Get a property by ID."""
        query = """
        SELECT * FROM properties WHERE id = %s
        """
        
        result = db.execute_query(query, (property_id,))
        return result[0] if result else None

class Note:
    @staticmethod
    def create(data: Dict[str, Any]) -> str:
        """Create a new note record."""
        query = """
        INSERT INTO notes (
            content, customer_id, project_id, property_id
        ) VALUES (%s, %s, %s, %s)
        RETURNING id
        """
        
        params = (
            data.get('content'),
            data.get('customer_id'),
            data.get('project_id'),
            data.get('property_id')
        )
        
        result = db.execute_query(query, params)
        return result[0]['id'] if result else None
    
    @staticmethod
    def update(note_id: str, data: Dict[str, Any]) -> bool:
        """Update an existing note record."""
        query = """
        UPDATE notes SET
            content = COALESCE(%s, content),
            updated_at = NOW()
        WHERE id = %s
        """
        
        params = (
            data.get('content'),
            note_id
        )
        
        db.execute_query(query, params)
        return True

class User:
    @staticmethod
    def create(data: Dict[str, Any]) -> str:
        """Create a new user record."""
        query = """
        INSERT INTO users (
            name, email, role, department, monday_id, monday_account_id, 
            monday_title, monday_team, metadata
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """
        
        # Process name from first_name and last_name if provided separately
        name = data.get('name')
        if not name and (data.get('first_name') or data.get('last_name')):
            name = f"{data.get('first_name', '')} {data.get('last_name', '')}".strip()
        
        # Prepare metadata as JSON
        metadata = data.get('metadata', {})
        if isinstance(metadata, str):
            # If it's already a JSON string, parse it first
            try:
                metadata = json.loads(metadata)
            except:
                metadata = {}
        
        # Add additional fields to metadata
        for field in ['phone', 'address', 'city', 'state', 'zip', 'shirt_size']:
            if data.get(field):
                metadata[field] = data.get(field)
        
        params = (
            name,
            data.get('email'),
            data.get('role', 'sales_agent'),
            data.get('department', 'Sales'),
            data.get('monday_id'),
            data.get('monday_account_id'),
            data.get('monday_title'),
            data.get('monday_team'),
            json.dumps(metadata)
        )
        
        result = db.execute_query(query, params)
        return result[0]['id'] if result else None
    
    @staticmethod
    def update(user_id: str, data: Dict[str, Any]) -> bool:
        """Update an existing user record."""
        query = """
        UPDATE users SET
            name = COALESCE(%s, name),
            email = COALESCE(%s, email),
            role = COALESCE(%s, role),
            department = COALESCE(%s, department),
            monday_id = COALESCE(%s, monday_id),
            monday_account_id = COALESCE(%s, monday_account_id),
            monday_title = COALESCE(%s, monday_title),
            monday_team = COALESCE(%s, monday_team),
            metadata = CASE 
                WHEN %s::jsonb IS NOT NULL THEN 
                    COALESCE(metadata, '{}'::jsonb) || %s::jsonb
                ELSE 
                    metadata
                END,
            updated_at = NOW()
        WHERE id = %s
        """
        
        # Process name from first_name and last_name if provided separately
        name = data.get('name')
        if not name and (data.get('first_name') or data.get('last_name')):
            name = f"{data.get('first_name', '')} {data.get('last_name', '')}".strip()
        
        # Prepare metadata update
        metadata_update = {}
        for field in ['phone', 'address', 'city', 'state', 'zip', 'shirt_size']:
            if data.get(field):
                metadata_update[field] = data.get(field)
        
        # Additional metadata fields from data
        if data.get('metadata'):
            if isinstance(data['metadata'], str):
                try:
                    additional_metadata = json.loads(data['metadata'])
                    metadata_update.update(additional_metadata)
                except:
                    pass
            elif isinstance(data['metadata'], dict):
                metadata_update.update(data['metadata'])
        
        metadata_json = json.dumps(metadata_update) if metadata_update else None
        
        params = (
            name,
            data.get('email'),
            data.get('role'),
            data.get('department'),
            data.get('monday_id'),
            data.get('monday_account_id'),
            data.get('monday_title'),
            data.get('monday_team'),
            metadata_json,
            metadata_json,
            user_id
        )
        
        db.execute_query(query, params)
        return True
    
    @staticmethod
    def get_by_email(email: str) -> Dict[str, Any]:
        """Get a user by email."""
        query = """
        SELECT * FROM users WHERE email = %s
        """
        
        result = db.execute_query(query, (email,))
        return result[0] if result else None

class Team:
    @staticmethod
    def create(data: Dict[str, Any]) -> str:
        """Create a new team record."""
        query = """
        INSERT INTO sales_teams (name, region, goals)
        VALUES (%s, %s, %s)
        RETURNING id
        """
        
        params = (
            data.get('name'),
            data.get('region', 'Unknown'),
            json.dumps(data.get('goals', {}))
        )
        
        result = db.execute_query(query, params)
        return result[0]['id'] if result else None
    
    @staticmethod
    def get_by_name(name: str) -> Optional[str]:
        """Get a team by name."""
        query = "SELECT id FROM sales_teams WHERE name = %s"
        params = (name,)
        
        result = db.execute_query(query, params)
        return result[0]['id'] if result else None


class PALaw:
    @staticmethod
    def create(data: Dict[str, Any]) -> str:
        """Create a new PA/Law record."""
        query = """
        INSERT INTO pa_law (name, phone, email)
        VALUES (%s, %s, %s)
        RETURNING id
        """
        
        params = (
            data.get('name'),
            data.get('phone'),
            data.get('email')
        )
        
        result = db.execute_query(query, params)
        return result[0]['id'] if result else None
    
    @staticmethod
    def update(palaw_id: str, data: Dict[str, Any]) -> bool:
        """Update an existing PA/Law record."""
        query = """
        UPDATE pa_law SET
            name = COALESCE(%s, name),
            phone = COALESCE(%s, phone),
            email = COALESCE(%s, email),
            updated_at = NOW()
        WHERE id = %s
        """
        
        params = (
            data.get('name'),
            data.get('phone'),
            data.get('email'),
            palaw_id
        )
        
        db.execute_query(query, params)
        return True
    
    @staticmethod
    def get_by_name(name: str) -> Optional[str]:
        """Get a PA/Law by name."""
        query = "SELECT id FROM pa_law WHERE name = %s"
        params = (name,)
        
        result = db.execute_query(query, params)
        return result[0]['id'] if result else None


class Insurance:
    @staticmethod
    def create(data: Dict[str, Any]) -> str:
        """Create a new insurance company record."""
        query = """
        INSERT INTO insurances (
            company_name, company_phone, company_email, 
            adjuster_name, adjuster_phone, adjuster_email
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
        """
        
        params = (
            data.get('company_name'),
            data.get('company_phone'),
            data.get('company_email'),
            data.get('adjuster_name'),
            data.get('adjuster_phone'),
            data.get('adjuster_email')
        )
        
        result = db.execute_query(query, params)
        return result[0]['id'] if result else None
    
    @staticmethod
    def update(insurance_id: str, data: Dict[str, Any]) -> bool:
        """Update an existing insurance company record."""
        query = """
        UPDATE insurances SET
            company_name = COALESCE(%s, company_name),
            company_phone = COALESCE(%s, company_phone),
            company_email = COALESCE(%s, company_email),
            adjuster_name = COALESCE(%s, adjuster_name),
            adjuster_phone = COALESCE(%s, adjuster_phone),
            adjuster_email = COALESCE(%s, adjuster_email),
            updated_at = NOW()
        WHERE id = %s
        """
        
        params = (
            data.get('company_name'),
            data.get('company_phone'),
            data.get('company_email'),
            data.get('adjuster_name'),
            data.get('adjuster_phone'),
            data.get('adjuster_email'),
            insurance_id
        )
        
        db.execute_query(query, params)
        return True
    
    @staticmethod
    def get_by_company_name(company_name: str) -> Optional[str]:
        """Get an insurance company by name."""
        query = "SELECT id FROM insurances WHERE company_name = %s"
        params = (company_name,)
        
        result = db.execute_query(query, params)
        return result[0]['id'] if result else None


class Policy:
    @staticmethod
    def create(data: Dict[str, Any]) -> str:
        """Create a new policy record."""
        query = """
        INSERT INTO policies (
            customer_id, policy_number, insurance_id, 
            start_date, end_date, coverage_amount, status
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """
        
        params = (
            data.get('customer_id'),
            data.get('policy_number'),
            data.get('insurance_id'),
            data.get('start_date'),
            data.get('end_date'),
            data.get('coverage_amount'),
            data.get('status', 'active')
        )
        
        result = db.execute_query(query, params)
        return result[0]['id'] if result else None
    
    @staticmethod
    def update(policy_id: str, data: Dict[str, Any]) -> bool:
        """Update an existing policy record."""
        query = """
        UPDATE policies SET
            customer_id = COALESCE(%s, customer_id),
            policy_number = COALESCE(%s, policy_number),
            insurance_id = COALESCE(%s, insurance_id),
            start_date = COALESCE(%s, start_date),
            end_date = COALESCE(%s, end_date),
            coverage_amount = COALESCE(%s, coverage_amount),
            status = COALESCE(%s, status),
            updated_at = NOW()
        WHERE id = %s
        """
        
        params = (
            data.get('customer_id'),
            data.get('policy_number'),
            data.get('insurance_id'),
            data.get('start_date'),
            data.get('end_date'),
            data.get('coverage_amount'),
            data.get('status'),
            policy_id
        )
        
        db.execute_query(query, params)
        return True
    
    @staticmethod
    def get_by_policy_number(policy_number: str) -> Optional[str]:
        """Get a policy by policy number."""
        query = "SELECT id FROM policies WHERE policy_number = %s"
        params = (policy_number,)
        
        result = db.execute_query(query, params)
        return result[0]['id'] if result else None
