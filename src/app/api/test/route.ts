import { NextRequest, NextResponse } from 'next/server';
import Imap from 'node-imap';
import { EMAIL_USER, EMAIL_PASSWORD } from '../email/config';

export async function GET(request: NextRequest) {
  console.log('Testing IMAP connection...');
  
  const imapConfig = {
    user: EMAIL_USER,
    password: EMAIL_PASSWORD,
    host: 'imap.mail.us-east-1.awsapps.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: 30000,
    connTimeout: 30000,
    debug: console.log,
  };
  
  console.log(`IMAP config: ${JSON.stringify({
    user: imapConfig.user,
    host: imapConfig.host,
    port: imapConfig.port,
  })}`);
  
  return new Promise((resolve) => {
    const imap = new Imap(imapConfig);
    
    imap.once('ready', () => {
      console.log('IMAP connection ready');
      
      imap.getBoxes((err, boxes) => {
        if (err) {
          console.error('Error getting mailboxes:', err);
          imap.end();
          return resolve(NextResponse.json({ 
            success: false, 
            error: String(err),
            stage: 'getBoxes'
          }));
        }
        
        console.log('Available mailboxes:', JSON.stringify(boxes, null, 2));
        
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            console.error('Error opening INBOX:', err);
            imap.end();
            return resolve(NextResponse.json({ 
              success: false, 
              error: String(err),
              stage: 'openBox',
              mailboxes: boxes
            }));
          }
          
          console.log('INBOX opened:', JSON.stringify(box, null, 2));
          
          imap.search(['ALL'], (err, results) => {
            if (err) {
              console.error('Error searching for messages:', err);
              imap.end();
              return resolve(NextResponse.json({ 
                success: false, 
                error: String(err),
                stage: 'search',
                mailboxes: boxes,
                inbox: box
              }));
            }
            
            console.log(`Search returned ${results.length} message UIDs`);
            
            imap.end();
            return resolve(NextResponse.json({ 
              success: true, 
              mailboxes: boxes,
              inbox: {
                messages: box.messages,
                flags: box.flags,
                permFlags: box.permFlags,
                uidvalidity: box.uidvalidity,
                uidnext: box.uidnext,
              },
              messageCount: results.length,
              sampleUIDs: results.slice(0, 10)
            }));
          });
        });
      });
    });
    
    imap.once('error', (err) => {
      console.error('IMAP connection error:', err);
      return resolve(NextResponse.json({ 
        success: false, 
        error: String(err),
        stage: 'connection'
      }));
    });
    
    imap.once('end', () => {
      console.log('IMAP connection ended');
    });
    
    console.log('Connecting to IMAP server...');
    imap.connect();
  });
} 