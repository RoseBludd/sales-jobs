/**
 * Script to fix all emails with missing sender information
 * 
 * Usage:
 * npx ts-node scripts/fix-email-senders.ts
 */

import { PrismaClient } from '@prisma/client';
import * as ewsService from '../src/lib/ews';

const prisma = new PrismaClient();

async function fixEmailsWithMissingSender() {
  try {
    console.log('Starting to fix emails with missing sender information');
    
    // Find all emails with missing sender information
    const emailsWithMissingSender = await prisma.$queryRaw`
      SELECT id, email_id, monday_user_id
      FROM emails
      WHERE (from_address IS NULL OR from_address = '' OR from_name IS NULL OR from_name = '')
    `;
    
    if (!Array.isArray(emailsWithMissingSender) || emailsWithMissingSender.length === 0) {
      console.log('No emails with missing sender information found');
      return;
    }
    
    console.log(`Found ${emailsWithMissingSender.length} emails with missing sender information`);
    
    // Process emails in batches
    const BATCH_SIZE = 10;
    let fixedCount = 0;
    let failedCount = 0;
    
    // Group emails by user ID for better organization
    const emailsByUser: Record<string, any[]> = {};
    
    for (const email of emailsWithMissingSender) {
      const userId = email.monday_user_id;
      if (!emailsByUser[userId]) {
        emailsByUser[userId] = [];
      }
      emailsByUser[userId].push(email);
    }
    
    // Process each user's emails
    for (const userId in emailsByUser) {
      const userEmails = emailsByUser[userId];
      console.log(`Processing ${userEmails.length} emails for user ${userId}`);
      
      // Split into batches
      for (let i = 0; i < userEmails.length; i += BATCH_SIZE) {
        const batch = userEmails.slice(i, i + BATCH_SIZE);
        
        // Process batch in parallel
        const promises = batch.map(async (email) => {
          try {
            // Get full email details from EWS
            const fullEmail = await ewsService.getEmailById(email.email_id);
            
            if (fullEmail && (fullEmail.from || fullEmail.fromName)) {
              // Update the email in the database
              await prisma.$executeRaw`
                UPDATE emails 
                SET 
                  from_address = ${fullEmail.from || 'no-sender@weroofamerica.com'},
                  from_name = ${fullEmail.fromName || 'Unknown Sender'},
                  last_synced_at = NOW()
                WHERE id = ${email.id}::UUID
              `;
              
              console.log(`Fixed sender information for email ${email.id}: ${fullEmail.fromName} <${fullEmail.from}>`);
              return true;
            } else {
              console.log(`Could not retrieve sender information for email ${email.id}`);
              return false;
            }
          } catch (error) {
            console.error(`Error fixing sender for email ${email.id}:`, error);
            return false;
          }
        });
        
        // Wait for all emails in the batch to be processed
        const results = await Promise.all(promises);
        const batchFixedCount = results.filter(result => result).length;
        const batchFailedCount = results.filter(result => !result).length;
        
        fixedCount += batchFixedCount;
        failedCount += batchFailedCount;
        
        console.log(`Batch completed: Fixed ${batchFixedCount}, Failed ${batchFailedCount}`);
        
        // Add a small delay between batches to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`Completed fixing emails: Fixed ${fixedCount}, Failed ${failedCount}`);
  } catch (error) {
    console.error('Error in fixEmailsWithMissingSender:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixEmailsWithMissingSender()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 