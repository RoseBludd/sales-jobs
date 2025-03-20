import requests
import xml.etree.ElementTree as ET
import base64
from datetime import datetime
import json
import re

# Constants
EWS_ENDPOINT = "https://ews.mail.us-east-1.awsapps.com/EWS/Exchange.asmx"
EMAIL = "j.black@weroofamerica.com"
PASSWORD = "RestoreMastersLLC2024"

# SOAP template for FindItem operation to get IDs first
FIND_ITEMS_TEMPLATE = """<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
               xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages">
  <soap:Header>
    <t:RequestServerVersion Version="Exchange2010_SP2" />
  </soap:Header>
  <soap:Body>
    <m:FindItem Traversal="Shallow">
      <m:ItemShape>
        <t:BaseShape>IdOnly</t:BaseShape>
      </m:ItemShape>
      <m:IndexedPageItemView MaxEntriesReturned="10" Offset="0" BasePoint="Beginning" />
      <m:ParentFolderIds>
        <t:DistinguishedFolderId Id="inbox" />
      </m:ParentFolderIds>
    </m:FindItem>
  </soap:Body>
</soap:Envelope>"""

# SOAP template for GetItem operation to get detailed info including MIME content
GET_ITEM_TEMPLATE = """<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
               xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages">
  <soap:Header>
    <t:RequestServerVersion Version="Exchange2010_SP2" />
  </soap:Header>
  <soap:Body>
    <m:GetItem>
      <m:ItemShape>
        <t:BaseShape>AllProperties</t:BaseShape>
        <t:IncludeMimeContent>true</t:IncludeMimeContent>
      </m:ItemShape>
      <m:ItemIds>
        {item_ids}
      </m:ItemIds>
    </m:GetItem>
  </soap:Body>
</soap:Envelope>"""

def create_auth_headers():
    """Create authentication headers for EWS requests"""
    auth_string = f"{EMAIL}:{PASSWORD}"
    auth_bytes = auth_string.encode('ascii')
    base64_bytes = base64.b64encode(auth_bytes)
    base64_auth = base64_bytes.decode('ascii')
    
    return {
        'Content-Type': 'text/xml; charset=utf-8',
        'Authorization': f'Basic {base64_auth}'
    }

def extract_from_mime(mime_content):
    """Extract sender information from MIME content"""
    from_address = ""
    from_name = ""
    
    # Look for standalone From: header line in MIME content
    from_match = re.search(r'^From:\s*([^\r\n]+)', mime_content, re.IGNORECASE | re.MULTILINE)
    if from_match and from_match.group(1):
        from_header = from_match.group(1).strip()
        
        # Parse email address and name from the From header
        if '<' in from_header and '>' in from_header:
            # Format: "Name <email@example.com>"
            from_name = from_header.split('<')[0].strip()
            from_address = from_header.split('<')[1].split('>')[0].strip()
        else:
            # Format: "email@example.com"
            from_address = from_header.strip()
    
    # If not found, try alternative patterns
    if not from_address:
        # Try to find any email pattern in the content
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', mime_content)
        if email_match:
            from_address = email_match.group(0)
    
    # Debug: Print the first few lines of MIME content to help with debugging
    print("\nFirst few lines of MIME content:")
    lines = mime_content.split('\n')[:20]  # First 20 lines
    for line in lines:
        if line.startswith('From:') or line.startswith('Return-Path:') or line.startswith('Sender:'):
            print(f"Found header: {line}")
    
    return from_name, from_address

def get_detailed_emails():
    """Get detailed email information including MIME content"""
    print(f"Connecting to WorkMail with email: {EMAIL}")
    
    headers = create_auth_headers()
    
    try:
        # Step 1: Get email IDs first
        print("Getting email IDs from inbox...")
        response = requests.post(EWS_ENDPOINT, headers=headers, data=FIND_ITEMS_TEMPLATE)
        
        if response.status_code != 200:
            print(f"Error: Received status code {response.status_code}")
            print(f"Response: {response.text}")
            return []
        
        # Parse the XML response to get item IDs
        root = ET.fromstring(response.content)
        
        # Define namespaces for XPath
        namespaces = {
            'soap': 'http://schemas.xmlsoap.org/soap/envelope/',
            't': 'http://schemas.microsoft.com/exchange/services/2006/types',
            'm': 'http://schemas.microsoft.com/exchange/services/2006/messages'
        }
        
        # Extract item IDs
        item_ids = []
        items = root.findall('.//t:ItemId', namespaces)
        
        for item in items:
            id_value = item.get('Id')
            change_key = item.get('ChangeKey')
            if id_value:
                item_ids.append((id_value, change_key))
        
        print(f"Found {len(item_ids)} email IDs")
        
        if not item_ids:
            return []
        
        # Step 2: Get detailed information for each email
        # Create ItemId elements for the GetItem request
        item_id_elements = ""
        for id_value, change_key in item_ids:
            item_id_elements += f'<t:ItemId Id="{id_value}" ChangeKey="{change_key}" />'
        
        # Create the GetItem request with the item IDs
        get_item_request = GET_ITEM_TEMPLATE.format(item_ids=item_id_elements)
        
        print("Getting detailed email information...")
        response = requests.post(EWS_ENDPOINT, headers=headers, data=get_item_request)
        
        if response.status_code != 200:
            print(f"Error: Received status code {response.status_code}")
            print(f"Response: {response.text}")
            return []
        
        # Save raw XML response to file for inspection
        with open('raw_ews_detailed_response.xml', 'wb') as f:
            f.write(response.content)
        print("Raw detailed XML response saved to raw_ews_detailed_response.xml")
        
        # Parse the XML response
        root = ET.fromstring(response.content)
        
        # Extract detailed email information
        emails = []
        items = root.findall('.//t:Message', namespaces)
        
        print(f"Processing {len(items)} detailed emails")
        
        for item in items:
            try:
                # Extract basic properties
                item_id = item.find('.//t:ItemId', namespaces)
                id_value = item_id.get('Id') if item_id is not None else 'Unknown'
                
                subject_elem = item.find('.//t:Subject', namespaces)
                subject = subject_elem.text if subject_elem is not None and subject_elem.text else '(No Subject)'
                
                # Extract MIME content
                mime_content_elem = item.find('.//t:MimeContent', namespaces)
                from_name = ""
                from_address = ""
                mime_content = ""
                
                if mime_content_elem is not None and mime_content_elem.text:
                    # Decode base64 MIME content
                    try:
                        mime_bytes = base64.b64decode(mime_content_elem.text)
                        mime_content = mime_bytes.decode('utf-8', errors='ignore')
                        
                        # Extract sender information from MIME content
                        from_name, from_address = extract_from_mime(mime_content)
                        
                        # If we found a sender, print it for debugging
                        if from_address:
                            print(f"Found sender for email '{subject}': {from_name} <{from_address}>")
                    except Exception as e:
                        print(f"Error decoding MIME content: {e}")
                
                # If sender info not found in MIME, try other approaches
                if not from_address:
                    print(f"No sender found in MIME for email '{subject}', trying alternative methods")
                    
                    # Try to find Return-Path in the MIME content
                    return_path_match = re.search(r'Return-Path:\s*<([^>]+)>', mime_content, re.IGNORECASE)
                    if return_path_match and return_path_match.group(1):
                        from_address = return_path_match.group(1).strip()
                        print(f"Found Return-Path: {from_address}")
                
                # Last resort: Use a placeholder
                if not from_address:
                    from_address = "no-sender@workmail.aws"
                    from_name = "AWS WorkMail"
                
                # Extract other properties
                date_received_elem = item.find('.//t:DateTimeReceived', namespaces)
                date_received = date_received_elem.text if date_received_elem is not None else None
                
                date_sent_elem = item.find('.//t:DateTimeSent', namespaces)
                date_sent = date_sent_elem.text if date_sent_elem is not None else None
                
                has_attachments_elem = item.find('.//t:HasAttachments', namespaces)
                has_attachments = has_attachments_elem.text.lower() == 'true' if has_attachments_elem is not None else False
                
                is_read_elem = item.find('.//t:IsRead', namespaces)
                is_read = is_read_elem.text.lower() == 'true' if is_read_elem is not None else False
                
                display_to_elem = item.find('.//t:DisplayTo', namespaces)
                display_to = display_to_elem.text if display_to_elem is not None else None
                
                # Create email object
                email = {
                    'id': id_value,
                    'subject': subject,
                    'from': from_address,
                    'fromName': from_name,
                    'to': display_to,
                    'receivedDate': date_received,
                    'sentDate': date_sent,
                    'hasAttachments': has_attachments,
                    'isRead': is_read
                }
                
                emails.append(email)
            except Exception as e:
                print(f"Error processing detailed email: {e}")
        
        return emails
    
    except Exception as e:
        print(f"Error fetching detailed emails: {e}")
        return []

if __name__ == "__main__":
    print("Starting EWS detailed email test...")
    emails = get_detailed_emails()
    
    # Print results
    print(f"\nRetrieved {len(emails)} detailed emails from inbox")
    print("\nEmail Summary:")
    for i, email in enumerate(emails, 1):
        print(f"{i}. Subject: {email['subject']}")
        print(f"   From: {email['fromName']} <{email['from']}>")
        print(f"   To: {email.get('to', 'N/A')}")
        print(f"   Received: {email['receivedDate']}")
        print(f"   Sent: {email.get('sentDate', 'N/A')}")
        print(f"   Read: {email['isRead']}, Attachments: {email['hasAttachments']}")
        print()
    
    # Save full results to JSON file
    with open('ews_detailed_emails.json', 'w') as f:
        json.dump(emails, f, indent=2)
    
    print(f"Full results saved to ews_detailed_emails.json") 