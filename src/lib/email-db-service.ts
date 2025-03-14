import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import * as ewsService from './ews';
import { WorkMailFolderName } from './ews';
import { prisma } from '@/lib/prisma';

// Type for email from EWS
interface EwsEmail {
  id: string;
  subject: string | null;
  from: string | null;
  fromName: string | null;
  body?: string | null;
  receivedDate?: string | null;
  hasAttachments: boolean;
  isRead: boolean;
  to?: string[];
  cc?: string[];
  importance?: string | null;
  internetMessageId?: string | null;
  size?: number | null;
}

// Get or create a user record
export async function getOrCreateUser(email: string, displayName?: string): Promise<string> {
  try {
    // Check if user exists
    const user = await prisma.$queryRaw`
      SELECT id FROM monday_users
      WHERE email = ${email}
      LIMIT 1
    `;
    
    if (Array.isArray(user) && user.length > 0) {
      return user[0].id;
    }
    
    // User not found, throw an error - users should be created through your auth system
    throw new Error(`User with email ${email} not found`);
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw new Error('Failed to get user');
  }
}

// Get the last sync time for a specific folder
async function getLastSyncTime(folderId: string, userId: string): Promise<Date | null> {
  try {
    const result = await prisma.$queryRaw`
      SELECT MAX(last_synced_at) as last_sync
      FROM emails
      WHERE folder_id = ${folderId}::UUID
      AND monday_user_id = ${userId}::UUID
    `;
    
    if (Array.isArray(result) && result.length > 0 && result[0].last_sync) {
      return new Date(result[0].last_sync);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
}

// Track folder sync status
async function updateFolderSyncStatus(folderId: string, syncCount: number): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE email_folders
      SET last_synced_at = NOW(),
          last_sync_count = ${syncCount}
      WHERE id = ${folderId}::UUID
    `;
  } catch (error) {
    console.error('Error updating folder sync status:', error);
    // Non-critical error, can continue
  }
}

// Get folder ID for a WorkMail folder
export async function getFolderByWorkMailName(
  workMailFolderName: WorkMailFolderName,
  userId: string
): Promise<string> {
  try {
    // Try to get the folder specific to this user
    // Cast the folder_id to TEXT for comparison with the enum
    const folder = await prisma.$queryRaw`
      SELECT id FROM email_folders 
      WHERE folder_id::TEXT = ${String(workMailFolderName)} 
      AND monday_user_id = ${userId}::UUID
      LIMIT 1
    `;
    
    if (Array.isArray(folder) && folder.length > 0) {
      return folder[0].id;
    }
    
    // Try to get the default folder
    const defaultFolder = await prisma.$queryRaw`
      SELECT id FROM email_folders 
      WHERE folder_id::TEXT = ${String(workMailFolderName)} 
      AND monday_user_id IS NULL
      LIMIT 1
    `;
    
    if (Array.isArray(defaultFolder) && defaultFolder.length > 0) {
      return defaultFolder[0].id;
    }
    
    // Folder not found, create it
    const result = await prisma.$executeRaw`
      INSERT INTO email_folders (id, folder_id, display_name, monday_user_id)
      VALUES (uuid_generate_v4(), ${String(workMailFolderName)}, ${getFolderDisplayName(workMailFolderName)}, ${userId}::UUID)
    `;
    
    // Get the newly created folder ID
    const createdFolder = await prisma.$queryRaw`
      SELECT id FROM email_folders 
      WHERE folder_id::TEXT = ${String(workMailFolderName)} 
      AND monday_user_id = ${userId}::UUID
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    if (Array.isArray(createdFolder) && createdFolder.length > 0) {
      return createdFolder[0].id;
    }
    
    throw new Error(`Failed to create folder ${workMailFolderName}`);
  } catch (error) {
    console.error('Error in getFolderByWorkMailName:', error);
    throw new Error('Failed to get folder ID');
  }
}

// Helper to get display name for a folder
function getFolderDisplayName(folderName: WorkMailFolderName): string {
  switch (folderName) {
    case WorkMailFolderName.Inbox:
      return 'Inbox';
    case WorkMailFolderName.SentItems:
      return 'Sent Items';
    case WorkMailFolderName.DeletedItems:
      return 'Deleted Items';
    case WorkMailFolderName.Drafts:
      return 'Drafts';
    case WorkMailFolderName.JunkEmail:
      return 'Junk Email';
    default:
      return 'Unknown Folder';
  }
}

// Save an email to the database
export async function saveEmail(
  email: EwsEmail,
  userId: string,
  folderId: string
): Promise<string> {
  try {
    // Check if the email already exists using raw query
    const existingEmail = await prisma.$queryRaw`
      SELECT id FROM emails
      WHERE email_id = ${email.id}
      AND monday_user_id = ${userId}::UUID
      LIMIT 1
    `;
    
    let emailId: string;
    
    if (Array.isArray(existingEmail) && existingEmail.length > 0) {
      // Update existing email
      emailId = existingEmail[0].id;
      
      await prisma.$executeRaw`
        UPDATE emails 
        SET 
          subject = ${email.subject},
          from_address = ${email.from},
          from_name = ${email.fromName},
          body = ${email.body || null},
          received_date = ${email.receivedDate ? new Date(email.receivedDate) : null},
          has_attachments = ${email.hasAttachments},
          is_read = ${email.isRead},
          importance = ${email.importance || null},
          internet_message_id = ${email.internetMessageId || null},
          size = ${email.size || null},
          last_synced_at = NOW()
        WHERE id = ${emailId}::UUID
      `;
      
      // Delete existing recipients to avoid duplicates
      await prisma.$executeRaw`
        DELETE FROM email_recipients 
        WHERE email_id = ${emailId}::UUID
      `;
    } else {
      // Insert new email - using a UUID for the ID
      const newEmailId = await prisma.$queryRaw`
        INSERT INTO emails (
          id, 
          email_id, 
          monday_user_id, 
          folder_id, 
          subject, 
          from_address, 
          from_name, 
          body,
          received_date, 
          has_attachments, 
          is_read, 
          importance, 
          internet_message_id, 
          size,
          last_synced_at
        ) VALUES (
          uuid_generate_v4(),
          ${email.id},
          ${userId}::UUID,
          ${folderId}::UUID,
          ${email.subject},
          ${email.from},
          ${email.fromName},
          ${email.body || null},
          ${email.receivedDate ? new Date(email.receivedDate) : null},
          ${email.hasAttachments},
          ${email.isRead},
          ${email.importance || null},
          ${email.internetMessageId || null},
          ${email.size || null},
          NOW()
        )
        RETURNING id
      `;
      
      if (!Array.isArray(newEmailId) || newEmailId.length === 0) {
        throw new Error('Failed to insert new email');
      }
      
      emailId = newEmailId[0].id;
    }
    
    // Add recipients
    if (email.to && email.to.length > 0) {
      for (const address of email.to) {
        await prisma.$executeRaw`
          INSERT INTO email_recipients (
            id,
            email_id, 
            recipient_type, 
            email_address
          ) VALUES (
            uuid_generate_v4(),
            ${emailId}::UUID, 
            'to', 
            ${address}
          )
        `;
      }
    }
    
    if (email.cc && email.cc.length > 0) {
      for (const address of email.cc) {
        await prisma.$executeRaw`
          INSERT INTO email_recipients (
            id,
            email_id, 
            recipient_type, 
            email_address
          ) VALUES (
            uuid_generate_v4(),
            ${emailId}::UUID, 
            'cc', 
            ${address}
          )
        `;
      }
    }
    
    return emailId;
  } catch (error) {
    console.error('Error in saveEmail:', error);
    throw new Error('Failed to save email');
  }
}

// Fetch emails from EWS and save to database
export async function syncEmailsFromEws(
  folderName: WorkMailFolderName = WorkMailFolderName.Inbox,
  pageSize: number = 50,
  offset: number = 0,
  forceFull: boolean = false
): Promise<number> {
  try {
    console.log(`Starting sync for folder ${folderName}, pageSize: ${pageSize}, offset: ${offset}, forceFull: ${forceFull}`);
    
    // Get the current user session
    const session = await getServerSession();
    const userEmail = session?.user?.email;
    
    if (!userEmail) {
      throw new Error('User email not available');
    }
    
    // Get or create user in the database
    const userId = await getOrCreateUser(userEmail);
    
    // Get folder ID
    const folderId = await getFolderByWorkMailName(folderName, userId);
    
    if (!folderId) {
      throw new Error(`Folder ${folderName} not found`);
    }
    
    // Check last sync time for incremental sync
    const lastSyncTime = !forceFull ? await getLastSyncTime(folderId, userId) : null;
    console.log(`Last sync time for folder ${folderName}: ${lastSyncTime?.toISOString() || 'none'}`);
    
    // Fetch emails from EWS
    const ewsEmails = await ewsService.getEmails(folderName, pageSize, offset, lastSyncTime);
    console.log(`Retrieved ${ewsEmails.length} emails from EWS for folder ${folderName}`);
    
    // Save each email to the database
    let savedCount = 0;
    
    for (const ewsEmail of ewsEmails) {
      try {
        // If we need the full email details with body
        if (!ewsEmail.body) {
          try {
            const fullEmail = await ewsService.getEmailById(ewsEmail.id);
            ewsEmail.body = fullEmail.body;
            ewsEmail.to = fullEmail.to;
            ewsEmail.cc = fullEmail.cc;
            ewsEmail.importance = fullEmail.importance;
            ewsEmail.internetMessageId = fullEmail.internetMessageId;
            ewsEmail.size = fullEmail.size;
          } catch (detailError) {
            console.error(`Error fetching details for email ${ewsEmail.id}:`, detailError);
            // Continue with the basic email data
          }
        }
        
        // Save to database
        await saveEmail(ewsEmail, userId, folderId);
        savedCount++;
      } catch (emailError) {
        console.error(`Error processing email from EWS:`, emailError);
        // Continue with next email
      }
    }
    
    // Update folder sync status
    await updateFolderSyncStatus(folderId, savedCount);
    
    // If we got a full page of results and haven't reached a reasonable limit, 
    // continue syncing with the next page
    if (ewsEmails.length === pageSize && savedCount > 0 && offset < 200) {
      // For performance reasons, we'll return the current batch count and let the caller
      // decide if they want to continue syncing
      console.log(`Completed batch sync of ${savedCount} emails, more may be available`);
      return savedCount;
    }
    
    console.log(`Completed sync of ${savedCount} emails for folder ${folderName}`);
    return savedCount;
  } catch (error) {
    console.error('Error in syncEmailsFromEws:', error);
    throw new Error('Failed to sync emails from EWS');
  }
}

// Get emails from database
export async function getEmailsFromDb(
  userId: string,
  folderName: WorkMailFolderName = WorkMailFolderName.Inbox,
  pageSize: number = 50,
  offset: number = 0
): Promise<any[]> {
  try {
    // Get folder ID
    const folderId = await getFolderByWorkMailName(folderName, userId);
    
    // Query emails
    const emails = await prisma.$queryRaw`
      SELECT * FROM emails
      WHERE monday_user_id = ${userId}::UUID
      AND folder_id = ${folderId}::UUID
      ORDER BY received_date DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;
    
    return Array.isArray(emails) ? emails.map(email => ({
      id: email.email_id,
      subject: email.subject,
      from: email.from_address,
      fromName: email.from_name,
      receivedDate: email.received_date ? new Date(email.received_date).toISOString() : null,
      hasAttachments: email.has_attachments,
      isRead: email.is_read
    })) : [];
  } catch (error) {
    console.error('Error in getEmailsFromDb:', error);
    throw new Error('Failed to get emails from database');
  }
}

// Get total email count in a folder
export async function getEmailCountFromDb(
  userId: string,
  folderName: WorkMailFolderName = WorkMailFolderName.Inbox
): Promise<number> {
  try {
    // Get folder ID
    const folderId = await getFolderByWorkMailName(folderName, userId);
    
    // Query email count
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM emails
      WHERE monday_user_id = ${userId}::UUID
      AND folder_id = ${folderId}::UUID
    `;
    
    if (Array.isArray(result) && result.length > 0) {
      return parseInt(result[0].count, 10);
    }
    
    return 0;
  } catch (error) {
    console.error('Error getting email count:', error);
    return 0;
  }
}

// Get email by ID from database
export async function getEmailByIdFromDb(emailId: string, userId: string): Promise<any> {
  try {
    // Get email
    const emailResult = await prisma.$queryRaw`
      SELECT * FROM emails
      WHERE email_id = ${emailId}
      AND monday_user_id = ${userId}::UUID
      LIMIT 1
    `;
    
    if (!Array.isArray(emailResult) || emailResult.length === 0) {
      throw new Error('Email not found');
    }
    
    const email = emailResult[0];
    
    // Get recipients
    const recipients = await prisma.$queryRaw`
      SELECT * FROM email_recipients
      WHERE email_id = ${email.id}::UUID
    `;
    
    // Group recipients by type
    const to = Array.isArray(recipients) ? 
      recipients.filter(r => r.recipient_type === 'to').map(r => r.email_address) : [];
    
    const cc = Array.isArray(recipients) ? 
      recipients.filter(r => r.recipient_type === 'cc').map(r => r.email_address) : [];
    
    const bcc = Array.isArray(recipients) ? 
      recipients.filter(r => r.recipient_type === 'bcc').map(r => r.email_address) : [];
    
    // Return formatted email
    return {
      id: email.email_id,
      subject: email.subject,
      from: email.from_address,
      fromName: email.from_name,
      to,
      cc,
      body: email.body,
      receivedDate: email.received_date ? new Date(email.received_date).toISOString() : null,
      hasAttachments: email.has_attachments,
      isRead: email.is_read,
      importance: email.importance,
      internetMessageId: email.internet_message_id,
      size: email.size
    };
  } catch (error) {
    console.error('Error in getEmailByIdFromDb:', error);
    throw new Error('Failed to get email from database');
  }
}

// Update email read status
export async function markEmailAsRead(emailId: string, userId: string): Promise<boolean> {
  try {
    // Find the email by its exchange ID
    const emailResult = await prisma.$queryRaw`
      SELECT id FROM emails
      WHERE email_id = ${emailId}
      AND monday_user_id = ${userId}::UUID
      LIMIT 1
    `;
    
    if (!Array.isArray(emailResult) || emailResult.length === 0) {
      return false;
    }
    
    const email = emailResult[0];
    
    // Update read status
    await prisma.$executeRaw`
      UPDATE emails
      SET is_read = true
      WHERE id = ${email.id}::UUID
    `;
    
    return true;
  } catch (error) {
    console.error('Error in markEmailAsRead:', error);
    throw new Error('Failed to mark email as read');
  }
}

// Get current user ID from session
export async function getCurrentUserId(): Promise<string> {
  const session = await getServerSession();
  const userEmail = session?.user?.email;
  
  if (!userEmail) {
    throw new Error('User email not available');
  }
  
  return await getOrCreateUser(userEmail);
}

// Create email sync API route that syncs all folders
export async function syncAllFolders(forceFull: boolean = false): Promise<{[key: string]: number}> {
  const results: {[key: string]: number} = {};
  
  try {
    // Sync each WorkMail folder with smaller page sizes to avoid timeouts
    results[WorkMailFolderName.Inbox] = await syncEmailsFromEws(WorkMailFolderName.Inbox, 50, 0, forceFull);
    results[WorkMailFolderName.SentItems] = await syncEmailsFromEws(WorkMailFolderName.SentItems, 50, 0, forceFull);
    results[WorkMailFolderName.Drafts] = await syncEmailsFromEws(WorkMailFolderName.Drafts, 25, 0, forceFull);
    results[WorkMailFolderName.DeletedItems] = await syncEmailsFromEws(WorkMailFolderName.DeletedItems, 25, 0, forceFull);
    results[WorkMailFolderName.JunkEmail] = await syncEmailsFromEws(WorkMailFolderName.JunkEmail, 25, 0, forceFull);
    
    return results;
  } catch (error) {
    console.error('Error syncing all folders:', error);
    throw new Error('Failed to sync all folders');
  }
} 