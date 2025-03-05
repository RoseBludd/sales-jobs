import boto3
from botocore.exceptions import ClientError
from botocore.config import Config
from exchangelib import (
    Credentials, Account, Configuration, DELEGATE, Message, 
    Mailbox, FileAttachment, errors, Folder
)
import sys

# AWS WorkMail organization details
REGION = 'us-east-1'
ORGANIZATION_ID = 'm-1cd33de1a5534be9bc6a9f95013f2bc8'

def get_workmail_credentials():
    """For development, use direct credentials. 
    In production, use AWS Secrets Manager."""
    return ("J.black@weroofamerica.com", "RestoreMastersLLC2024")

def setup_account(email, password):
    """Set up the Exchange account connection"""
    try:
        # First try autodiscover
        credentials = Credentials(email, password)
        try:
            account = Account(email, credentials=credentials, autodiscover=True)
            print("Connected via autodiscover")
            return account
        except Exception as e:
            print(f"Autodiscover failed: {e}")
        
        # If autodiscover fails, use direct EWS endpoint
        ews_url = f"https://ews.mail.{REGION}.awsapps.com/{ORGANIZATION_ID}/EWS/Exchange.asmx"
        config = Configuration(service_endpoint=ews_url, credentials=credentials)
        account = Account(
            primary_smtp_address=email,
            config=config,
            autodiscover=False,
            access_type=DELEGATE
        )
        print("Connected via EWS endpoint")
        return account
    
    except errors.UnauthorizedError as e:
        print(f"Invalid credentials: {e}")
        sys.exit(1)
    except errors.ErrorPasswordExpired as e:
        print(f"Password expired. Please change the password and try again: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error connecting to mailbox: {e}")
        sys.exit(1)

def create_subfolder(account, folder_name):
    """Create a subfolder in the inbox"""
    try:
        folder = Folder(parent=account.inbox, name=folder_name)
        folder.save()
        print(f"Subfolder '{folder_name}' created successfully!")
        return True
    except Exception as e:
        print(f"Error creating subfolder '{folder_name}': {e}")
        return False

def get_subfolder(account, folder_name):
    """Get or create a subfolder in the inbox"""
    try:
        folder = account.inbox / folder_name
        return folder
    except errors.ErrorFolderNotFound:
        print(f"Folder not found. Creating subfolder '{folder_name}' in inbox...")
        if create_subfolder(account, folder_name):
            return account.inbox / folder_name
    except Exception as e:
        print(f"Error accessing folder: {e}")
        raise e

def read_emails(account, limit=10):
    """Read the most recent emails"""
    print(f"\nReading {limit} most recent emails:")
    print("-" * 50)
    for item in account.inbox.all().order_by('-datetime_received')[:limit]:
        print(f"Subject: {item.subject}")
        print(f"From: {item.sender.email_address}")
        print(f"Received: {item.datetime_received}")
        print(f"Body: {item.text_body[:100]}..." if item.text_body else "No text body")
        print("-" * 50)

def send_test_email(account, to_email):
    """Send a test email"""
    try:
        message = Message(
            account=account,
            subject='Test Email from Python',
            body='This is a test email sent using exchangelib.',
            to_recipients=[Mailbox(email_address=to_email)]
        )
        message.send()
        print(f"\nTest email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"Error sending test email: {e}")
        return False

def main():
    print("AWS WorkMail Email Management")
    print("=" * 30)
    
    email, password = get_workmail_credentials()
    account = setup_account(email, password)
    
    while True:
        print("\nOptions:")
        print("1. Read recent emails")
        print("2. Send test email")
        print("3. Create folder")
        print("4. Exit")
        
        choice = input("Enter your choice (1-4): ")
        
        if choice == '1':
            limit = int(input("How many emails to read? (default 10): ") or 10)
            read_emails(account, limit)
        
        elif choice == '2':
            to_email = input("Enter recipient email: ")
            send_test_email(account, to_email)
        
        elif choice == '3':
            folder_name = input("Enter folder name: ")
            create_subfolder(account, folder_name)
        
        elif choice == '4':
            print("Goodbye!")
            break
        
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()