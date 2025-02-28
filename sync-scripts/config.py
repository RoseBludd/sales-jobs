import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Monday.com API Configuration
MONDAY_API_KEY = os.environ.get('MONDAY_API_KEY')
MONDAY_BOARD_ID_USERS = os.environ.get('MONDAY_BOARD_ID_USERS', '5764059860')
MONDAY_BOARD_ID_DATA = os.environ.get('MONDAY_BOARD_ID_DATA', '6727219152')

# Database Configuration
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://neondb_owner:npg_Y0CM8vIVoilD@ep-young-sun-a52te82c-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require')

# Webhook Configuration
MONDAY_WEBHOOK_SECRET = os.environ.get('MONDAY_WEBHOOK_SECRET', '')
WEBHOOK_BASE_URL = os.environ.get('WEBHOOK_BASE_URL', 'http://localhost:5000')

# Server Configuration
PORT = int(os.environ.get('PORT', 5000))

# Validate required configuration
if not MONDAY_API_KEY:
    raise ValueError("MONDAY_API_KEY must be set in environment variables")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL must be set in environment variables")

# Print configuration summary (for debugging only, remove in production)
def print_config():
    """Print the current configuration for debugging."""
    print("Current Configuration:")
    print(f"MONDAY_BOARD_ID_USERS: {MONDAY_BOARD_ID_USERS}")
    print(f"MONDAY_BOARD_ID_DATA: {MONDAY_BOARD_ID_DATA}")
    print(f"DATABASE_URL: {'[REDACTED]' if DATABASE_URL else 'Not Set'}")
    print(f"MONDAY_API_KEY: {'[REDACTED]' if MONDAY_API_KEY else 'Not Set'}")
    print(f"WEBHOOK_BASE_URL: {WEBHOOK_BASE_URL}")
    print(f"PORT: {PORT}")

if __name__ == "__main__":
    print_config()
