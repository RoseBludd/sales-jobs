-- SQL File for Creating Email Storage Schema for NeonDB PostgreSQL

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS email_attachments;
DROP TABLE IF EXISTS email_recipients;
DROP TABLE IF EXISTS emails;
DROP TABLE IF EXISTS email_folders;

-- Create folders table to track email folders from Exchange
CREATE TABLE email_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id VARCHAR(255) NOT NULL, -- Exchange folder ID
    display_name VARCHAR(255) NOT NULL,
    parent_folder_id VARCHAR(255),
    monday_user_id UUID REFERENCES monday_users(id) ON DELETE CASCADE,
    total_count INTEGER DEFAULT 0,
    child_folder_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(monday_user_id, folder_id)
);

-- Create emails table
CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_id VARCHAR(255) NOT NULL, -- Exchange email ID
    monday_user_id UUID REFERENCES monday_users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES email_folders(id) ON DELETE SET NULL,
    subject TEXT,
    from_address VARCHAR(255),
    from_name VARCHAR(255),
    body TEXT,
    received_date TIMESTAMPTZ,
    has_attachments BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    importance VARCHAR(50),
    internet_message_id VARCHAR(255),
    size INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(monday_user_id, email_id)
);

-- Create email recipients table
CREATE TABLE email_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
    recipient_type VARCHAR(10) NOT NULL, -- 'to', 'cc', or 'bcc'
    email_address VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create email attachments table
CREATE TABLE email_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(255),
    size INTEGER,
    content_id VARCHAR(255),
    is_inline BOOLEAN DEFAULT FALSE,
    attachment_id VARCHAR(255), -- Exchange attachment ID
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_emails_user_id ON emails(monday_user_id);
CREATE INDEX idx_emails_folder_id ON emails(folder_id);
CREATE INDEX idx_emails_received_date ON emails(received_date);
CREATE INDEX idx_emails_is_read ON emails(is_read);
CREATE INDEX idx_emails_has_attachments ON emails(has_attachments);
CREATE INDEX idx_email_recipients_email_id ON email_recipients(email_id);
CREATE INDEX idx_email_recipients_email_address ON email_recipients(email_address);
CREATE INDEX idx_email_attachments_email_id ON email_attachments(email_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_email_folders_updated_at
    BEFORE UPDATE ON email_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emails_updated_at
    BEFORE UPDATE ON emails
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert only AWS WorkMail supported folder types (wrapped in a transaction)
BEGIN;
INSERT INTO email_folders (folder_id, display_name, monday_user_id) VALUES
('INBOX', 'Inbox', NULL),
('SENT_ITEMS', 'Sent Items', NULL),
('DELETED_ITEMS', 'Deleted Items', NULL),
('DRAFTS', 'Drafts', NULL),
('JUNK_EMAIL', 'Junk Email', NULL);
COMMIT;

-- Add comments for documentation
COMMENT ON TABLE emails IS 'Stores email data retrieved from Exchange Web Services';
COMMENT ON TABLE email_recipients IS 'Stores recipients (to, cc, bcc) for each email';
COMMENT ON TABLE email_attachments IS 'Stores metadata about email attachments';
COMMENT ON TABLE email_folders IS 'Stores Exchange folder information'; 

-- Add tracking columns to email_folders table
ALTER TABLE email_folders 
ADD COLUMN last_synced_at TIMESTAMP,
ADD COLUMN last_sync_count INTEGER DEFAULT 0;

-- Make sure the emails table has the last_synced_at column too
-- (This might already exist, but adding just to be safe)
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;