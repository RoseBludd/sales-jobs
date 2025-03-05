import imaplib
import email
from email.header import decode_header

# IMAP configuration
IMAP_SERVER = "imap.mail.us-east-1.awsapps.com"
IMAP_PORT = 993
EMAIL = "j.parker@weroofamerica.com"
PASSWORD = "RestoreMastersLLC2024"

# Connect to the IMAP server
def fetch_emails():
    try:
        # Connect to the server
        mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
        
        # Login
        mail.login(EMAIL, PASSWORD)
        
        # Select the inbox
        mail.select("INBOX")
        
        # Search for all emails
        status, messages = mail.search(None, "ALL")
        if status != "OK":
            print("No emails found.")
            return
        
        # Fetch the last 10 emails
        email_ids = messages[0].split()
        for email_id in email_ids[-10:]:  # Last 10 emails
            status, msg_data = mail.fetch(email_id, "(RFC822)")
            if status != "OK":
                continue
            
            # Parse the email
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    subject, encoding = decode_header(msg["Subject"])[0]
                    if isinstance(subject, bytes):
                        subject = subject.decode(encoding or "utf-8")
                    from_ = msg.get("From")
                    date = msg.get("Date")
                    
                    print(f"Subject: {subject}")
                    print(f"From: {from_}")
                    print(f"Date: {date}")
                    
                    # Get email body
                    body = ""
                    if msg.is_multipart():
                        # Handle multipart messages
                        for part in msg.walk():
                            if part.get_content_type() == "text/plain":
                                try:
                                    body = part.get_payload(decode=True).decode(part.get_content_charset() or 'utf-8')
                                    break
                                except:
                                    continue
                    else:
                        # Handle plain text messages
                        try:
                            body = msg.get_payload(decode=True).decode(msg.get_content_charset() or 'utf-8')
                        except:
                            body = "Could not decode message body"
                    
                    print("Body:")
                    print(body)
                    print("-" * 50)
        
        # Logout
        mail.logout()
    
    except Exception as e:
        print(f"Error: {e}")

# Fetch emails
fetch_emails()