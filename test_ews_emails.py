import requests
import xml.etree.ElementTree as ET
import base64
from datetime import datetime
import json

# Constants
EWS_ENDPOINT = "https://ews.mail.us-east-1.awsapps.com/EWS/Exchange.asmx"
EMAIL = "j.black@weroofamerica.com"
PASSWORD = "RestoreMastersLLC2024"

# SOAP envelope template for FindItem operation with additional properties
SOAP_TEMPLATE = """<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
               xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages">
  <soap:Header>
    <t:RequestServerVersion Version="Exchange2010_SP2" />
  </soap:Header>
  <soap:Body>
    <m:FindItem Traversal="Shallow">
      <m:ItemShape>
        <t:BaseShape>AllProperties</t:BaseShape>
        <t:BodyType>HTML</t:BodyType>
        <t:AdditionalProperties>
          <t:FieldURI FieldURI="item:InternetMessageHeaders" />
        </t:AdditionalProperties>
      </m:ItemShape>
      <m:IndexedPageItemView MaxEntriesReturned="50" Offset="0" BasePoint="Beginning" />
      <m:ParentFolderIds>
        <t:DistinguishedFolderId Id="inbox" />
      </m:ParentFolderIds>
    </m:FindItem>
  </soap:Body>
</soap:Envelope>"""

def get_emails_from_inbox():
    """Fetch emails from the inbox folder using EWS SOAP API"""
    print(f"Connecting to WorkMail with email: {EMAIL}")
    
    # Create Basic Auth header
    auth_string = f"{EMAIL}:{PASSWORD}"
    auth_bytes = auth_string.encode('ascii')
    base64_bytes = base64.b64encode(auth_bytes)
    base64_auth = base64_bytes.decode('ascii')
    
    headers = {
        'Content-Type': 'text/xml; charset=utf-8',
        'Authorization': f'Basic {base64_auth}'
    }
    
    try:
        # Make the SOAP request
        print("Sending request to EWS endpoint...")
        response = requests.post(EWS_ENDPOINT, headers=headers, data=SOAP_TEMPLATE)
        
        # Check if request was successful
        if response.status_code != 200:
            print(f"Error: Received status code {response.status_code}")
            print(f"Response: {response.text}")
            return []
        
        # Save raw XML response to file for inspection
        with open('raw_ews_response.xml', 'wb') as f:
            f.write(response.content)
        print("Raw XML response saved to raw_ews_response.xml")
        
        # Parse the XML response
        print("Parsing response...")
        root = ET.fromstring(response.content)
        
        # Define namespaces for XPath
        namespaces = {
            'soap': 'http://schemas.xmlsoap.org/soap/envelope/',
            't': 'http://schemas.microsoft.com/exchange/services/2006/types',
            'm': 'http://schemas.microsoft.com/exchange/services/2006/messages'
        }
        
        # Extract emails
        emails = []
        items = root.findall('.//t:Items/t:Message', namespaces)
        
        print(f"Found {len(items)} emails")
        
        for item in items:
            try:
                # Extract basic properties
                item_id = item.find('.//t:ItemId', namespaces)
                id_value = item_id.get('Id') if item_id is not None else 'Unknown'
                
                subject_elem = item.find('.//t:Subject', namespaces)
                subject = subject_elem.text if subject_elem is not None and subject_elem.text else '(No Subject)'
                
                # Extract sender information - try multiple approaches
                from_address = ''
                from_name = ''
                
                # 1. Try to get from InternetMessageHeaders
                headers = item.findall('.//t:InternetMessageHeader', namespaces)
                for header in headers:
                    header_name = header.get('HeaderName')
                    if header_name and header_name.lower() == 'from' and header.text:
                        # Try to parse email from header text (e.g., "Name <email@example.com>")
                        from_header = header.text
                        if '<' in from_header and '>' in from_header:
                            from_name = from_header.split('<')[0].strip()
                            from_address = from_header.split('<')[1].split('>')[0].strip()
                        else:
                            from_address = from_header
                
                # 2. If not found, try to extract from DisplayTo (might be reply emails)
                if not from_address:
                    display_to = item.find('.//t:DisplayTo', namespaces)
                    if display_to is not None and display_to.text:
                        # This is not ideal but can help identify some emails
                        display_to_text = display_to.text
                        if '@' in display_to_text:
                            # This might be a reply, so the original sender could be the recipient
                            from_address = f"Reply to: {display_to_text}"
                
                # 3. If still not found, check for other potential sender fields
                if not from_address:
                    # Try ReceivedBy
                    received_by = item.find('.//t:ReceivedBy/t:Mailbox/t:EmailAddress', namespaces)
                    if received_by is not None and received_by.text:
                        from_address = received_by.text
                        
                        received_by_name = item.find('.//t:ReceivedBy/t:Mailbox/t:Name', namespaces)
                        if received_by_name is not None and received_by_name.text:
                            from_name = received_by_name.text
                
                # 4. Last resort: Use a placeholder
                if not from_address:
                    from_address = "no-sender@workmail.aws"
                    from_name = "AWS WorkMail"
                
                # Extract date received
                date_received_elem = item.find('.//t:DateTimeReceived', namespaces)
                date_received = date_received_elem.text if date_received_elem is not None else None
                
                # Extract other properties
                has_attachments_elem = item.find('.//t:HasAttachments', namespaces)
                has_attachments = has_attachments_elem.text.lower() == 'true' if has_attachments_elem is not None else False
                
                is_read_elem = item.find('.//t:IsRead', namespaces)
                is_read = is_read_elem.text.lower() == 'true' if is_read_elem is not None else False
                
                # Create email object
                email = {
                    'id': id_value,
                    'subject': subject,
                    'from': from_address,
                    'fromName': from_name,
                    'receivedDate': date_received,
                    'hasAttachments': has_attachments,
                    'isRead': is_read
                }
                
                # Add additional fields that might be useful
                display_to = item.find('.//t:DisplayTo', namespaces)
                if display_to is not None and display_to.text:
                    email['displayTo'] = display_to.text
                
                date_sent_elem = item.find('.//t:DateTimeSent', namespaces)
                if date_sent_elem is not None and date_sent_elem.text:
                    email['sentDate'] = date_sent_elem.text
                
                emails.append(email)
            except Exception as e:
                print(f"Error processing email: {e}")
        
        return emails
    
    except Exception as e:
        print(f"Error fetching emails: {e}")
        return []

if __name__ == "__main__":
    print("Starting EWS email test...")
    emails = get_emails_from_inbox()
    
    # Print results
    print(f"\nRetrieved {len(emails)} emails from inbox")
    print("\nEmail Summary:")
    for i, email in enumerate(emails[:10], 1):  # Show first 10 emails
        print(f"{i}. Subject: {email['subject']}")
        print(f"   From: {email['fromName']} <{email['from']}>")
        print(f"   To: {email.get('displayTo', 'N/A')}")
        print(f"   Received: {email['receivedDate']}")
        print(f"   Sent: {email.get('sentDate', 'N/A')}")
        print(f"   Read: {email['isRead']}, Attachments: {email['hasAttachments']}")
        print()
    
    # Save full results to JSON file
    with open('ews_emails.json', 'w') as f:
        json.dump(emails, f, indent=2)
    
    print(f"Full results saved to ews_emails.json") 