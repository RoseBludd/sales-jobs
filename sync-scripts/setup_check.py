import os
import sys
import requests
import psycopg2
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def check_monday_api():
    """Check Monday.com API connectivity."""
    print("\n🔍 Checking Monday.com API connectivity...")
    
    api_key = os.environ.get('MONDAY_API_KEY')
    if not api_key:
        print("❌ MONDAY_API_KEY not found in environment variables")
        return False
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": api_key
    }
    
    query = """
    query {
        me {
            name
            email
        }
    }
    """
    
    try:
        response = requests.post(
            "https://api.monday.com/v2",
            json={"query": query},
            headers=headers
        )
        
        if response.status_code != 200:
            print(f"❌ Monday.com API request failed with status code {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        if 'errors' in data:
            print(f"❌ Monday.com API returned errors: {data['errors']}")
            return False
        
        user_name = data.get('data', {}).get('me', {}).get('name')
        if user_name:
            print(f"✅ Successfully connected to Monday.com API as {user_name}")
            return True
        else:
            print("❌ Could not retrieve user information from Monday.com API")
            return False
    
    except Exception as e:
        print(f"❌ Error connecting to Monday.com API: {str(e)}")
        return False

def check_database():
    """Check database connectivity."""
    print("\n🔍 Checking database connectivity...")
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        return False
    
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # Try a simple query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if version:
            print(f"✅ Successfully connected to PostgreSQL database")
            print(f"   Database version: {version[0]}")
            return True
        else:
            print("❌ Could not retrieve database version")
            return False
    
    except Exception as e:
        print(f"❌ Error connecting to database: {str(e)}")
        return False

def check_environment_variables():
    """Check if all required environment variables are set."""
    print("\n🔍 Checking environment variables...")
    
    required_vars = [
        'MONDAY_API_KEY',
        'MONDAY_BOARD_ID_USERS',
        'MONDAY_BOARD_ID_DATA',
        'DATABASE_URL'
    ]
    
    optional_vars = [
        'MONDAY_WEBHOOK_SECRET',
        'WEBHOOK_BASE_URL',
        'PORT'
    ]
    
    all_required_present = True
    
    # Check required variables
    for var in required_vars:
        if os.environ.get(var):
            print(f"✅ {var} is set")
        else:
            print(f"❌ {var} is not set (required)")
            all_required_present = False
    
    # Check optional variables
    print("\nOptional variables:")
    for var in optional_vars:
        if os.environ.get(var):
            print(f"✅ {var} is set")
        else:
            print(f"⚠️ {var} is not set (optional)")
    
    return all_required_present

def main():
    """Main function to run all checks."""
    print("🚀 Running setup verification checks")
    
    env_check = check_environment_variables()
    monday_check = check_monday_api()
    db_check = check_database()
    
    print("\n📋 Summary:")
    print(f"Environment Variables: {'✅ OK' if env_check else '❌ FAILED'}")
    print(f"Monday.com API: {'✅ OK' if monday_check else '❌ FAILED'}")
    print(f"Database Connection: {'✅ OK' if db_check else '❌ FAILED'}")
    
    if env_check and monday_check and db_check:
        print("\n🎉 All checks passed! Your environment is correctly set up.")
        return 0
    else:
        print("\n⚠️ Some checks failed. Please fix the issues above before running the sync scripts.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
