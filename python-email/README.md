# Python EWS Email Integration for AWS WorkMail

This directory contains Python scripts for interacting with Exchange Web Services (EWS) to retrieve and send emails through AWS WorkMail.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
- Windows:
```bash
venv\Scripts\activate
```
- Unix/MacOS:
```bash
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Configuration

Edit `ews_email.py` and update the credentials in the `get_workmail_credentials()` function:

```python
def get_workmail_credentials():
    return ("your.email@weroofamerica.com", "your-password")
```

The script is pre-configured with:
- Region: us-east-1
- Organization ID: m-1cd33de1a5534be9bc6a9f95013f2bc8

## Features

1. Read Emails
   - View the most recent emails in your inbox
   - Customize how many emails to display

2. Send Test Emails
   - Send test emails to verify your connection
   - Emails are sent through your WorkMail account

3. Folder Management
   - Create new folders in your inbox
   - Access existing folders

## Usage

With the virtual environment activated, run:
```bash
python ews_email.py
```

You'll see an interactive menu with options to:
1. Read recent emails
2. Send a test email
3. Create a folder
4. Exit

## Error Handling

The script includes robust error handling for common issues:
- Invalid credentials
- Expired passwords
- Connection problems
- Folder creation errors

## Troubleshooting

If you encounter issues:
1. Verify your AWS WorkMail credentials
2. Ensure you're using the correct email address
3. Check your network connection
4. Try both autodiscover and direct EWS endpoint connection methods