import {
  ExchangeService,
  WebCredentials,
  Uri,
  WellKnownFolderName,
  ItemView,
  PropertySet,
  BasePropertySet,
  EmailMessage,
  MessageBody,
  EmailAddress,
  Mailbox,
  Item,
  DateTime,
  SearchFilter,
  FolderView,
  FindFoldersResults,
  Folder,
  DeleteMode,
  BodyType,
  ContainmentMode,
  ComparisonMode,
  FindItemsResults,
  ExchangeVersion,
  ItemId,
  FolderId,
  ConflictResolutionMode,
  CalendarView,
  PagedView,
  ItemSchema
} from 'ews-javascript-api';
import { getServerSession } from 'next-auth';

// Define AWS WorkMail folder types
export enum WorkMailFolderName {
  Inbox = "INBOX",
  DeletedItems = "DELETED_ITEMS",
  SentItems = "SENT_ITEMS",
  Drafts = "DRAFTS",
  JunkEmail = "JUNK_EMAIL"
}

// Map AWS WorkMail folder names to Exchange WellKnownFolderName
export const mapWorkMailToExchangeFolder = (workMailFolder: WorkMailFolderName): WellKnownFolderName => {
  switch (workMailFolder) {
    case WorkMailFolderName.Inbox:
      return WellKnownFolderName.Inbox;
    case WorkMailFolderName.DeletedItems:
      return WellKnownFolderName.DeletedItems;
    case WorkMailFolderName.SentItems:
      return WellKnownFolderName.SentItems;
    case WorkMailFolderName.Drafts:
      return WellKnownFolderName.Drafts;
    case WorkMailFolderName.JunkEmail:
      return WellKnownFolderName.JunkEmail;
    default:
      return WellKnownFolderName.Inbox; // Default to Inbox
  }
};

// Error class for EWS-related errors
export class EWSError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'EWSError';
  }
}

// Logger for EWS operations
export const logEWSError = (error: Error) => {
  console.error(`[EWS Error] ${new Date().toISOString()}`, {
    message: error.message,
    stack: error.stack,
    correlationId: crypto.randomUUID()
  });
};

// Initialize EWS service with credentials
export const initEWSService = async (): Promise<ExchangeService> => {
  try {
    const service = new ExchangeService(ExchangeVersion.Exchange2010_SP2);
    
    // Get the authenticated user's email from the session
    const session = await getServerSession();
    const userEmail = session?.user?.email || process.env.WORKMAIL_EMAIL || '';
    
    // Map the domain from @restoremastersllc.com to @weroofamerica.com
    let mappedEmail = userEmail;
    if (userEmail && userEmail.includes('@restoremastersllc.com')) {
      const username = userEmail.split('@')[0];
      mappedEmail = `${username}@weroofamerica.com`;
    }
    
    // Always use the fixed password for WorkMail
    const password = 'RestoreMastersLLC2024';
    
    if (!mappedEmail) {
      throw new EWSError('User email not available for WorkMail authentication');
    }
    
    console.log(`Connecting to WorkMail with mapped email: ${mappedEmail}`);
    service.Credentials = new WebCredentials(mappedEmail, password);
    
    // Set the EWS endpoint URL
    const ewsEndpoint = process.env.EWS_ENDPOINT || 'https://ews.mail.us-east-1.awsapps.com/EWS/Exchange.asmx';
    service.Url = new Uri(ewsEndpoint);
    
    return service;
  } catch (error) {
    logEWSError(error as Error);
    throw new EWSError('Failed to initialize EWS service', error);
  }
};

// Helper function to convert string ID to ItemId
const createItemIdFromString = (id: string): ItemId => {
  // Create ItemId with a null parameter to avoid the constructor error
  const itemId = new ItemId(null as any);
  itemId.UniqueId = id;
  return itemId;
};

// Helper function to convert string ID to FolderId
const createFolderIdFromString = (id: string): FolderId => {
  // Create FolderId with a null parameter to avoid the constructor error
  const folderId = new FolderId(null as any);
  folderId.UniqueId = id;
  return folderId;
};

// Get emails from a folder with pagination
export async function getEmails(
  folderName: WorkMailFolderName = WorkMailFolderName.Inbox,
  pageSize: number = 50,
  offset: number = 0,
  lastSyncTime?: Date | null
): Promise<any[]> {
  try {
    // Initialize the Exchange service
    const service = await initEWSService();

    // Set up the view to retrieve emails with basic properties only
    const view = new ItemView(pageSize, offset);
    
    // Use the default FirstClassProperties but don't add any additional properties
    // that aren't supported in FindItem (like Body or MimeContent)
    const propertySet = new PropertySet(BasePropertySet.FirstClassProperties);
    view.PropertySet = propertySet;
    
    // Convert WorkMail folder name to Exchange folder name
    const exchangeFolderName = mapWorkMailToExchangeFolder(folderName);
    
    // For incremental sync, we'll use a different approach
    // Instead of using a filter which is causing issues, we'll retrieve all emails
    // and filter them on the client side if lastSyncTime is provided
    const results = await service.FindItems(exchangeFolderName, view);
    
    // Process and extract basic data from the emails
    const emails = results.Items.map((email: any) => {
      // Extract basic properties
      const basicEmail: {
        id: string;
        subject: string;
        from: string;
        fromName: string;
        receivedDate: string | null;
        hasAttachments: boolean;
        isRead: boolean;
        body: null;
        to: string[];
        cc: string[];
      } = {
        id: email.Id.UniqueId,
        subject: email.Subject || '(No Subject)',
        from: email.From?.Address || '',
        fromName: email.From?.Name || '',
        receivedDate: email.DateTimeReceived ? email.DateTimeReceived.ToISOString() : null,
        hasAttachments: email.HasAttachments || false,
        isRead: email.IsRead || false,
        body: null, // We'll fetch the body separately when needed
        to: [],
        cc: []
      };
      
      // Try to extract recipients if available
      if (email.ToRecipients) {
        basicEmail.to = Array.from(email.ToRecipients as any).map((r: any) => r.Address);
      }
      
      if (email.CcRecipients) {
        basicEmail.cc = Array.from(email.CcRecipients as any).map((r: any) => r.Address);
      }
      
      return basicEmail;
    });
    
    // Log sender information for debugging
    emails.forEach(email => {
      console.log(`EWS getEmails: Email ${email.id}, from: ${email.fromName} <${email.from}>`);
      
      // If sender information is missing, log a warning
      if (!email.from && !email.fromName) {
        console.warn(`EWS getEmails: Missing sender information for email ${email.id}, subject: ${email.subject}`);
      }
    });
    
    // If lastSyncTime is provided, filter out older emails
    if (lastSyncTime) {
      const syncTimestamp = lastSyncTime.getTime();
      return emails.filter(email => {
        // Only keep emails that are newer than the last sync time
        if (!email.receivedDate) return true; // Keep emails with no date
        const emailTimestamp = new Date(email.receivedDate).getTime();
        return emailTimestamp > syncTimestamp;
      });
    }
    
    return emails;
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error; // Rethrow to handle it in the calling function
  }
}

export const getEmailById = async (emailId: string): Promise<any> => {
  try {
    console.log(`EWS: Getting email by ID: ${emailId}`);
    const service = await initEWSService();
    
    // Create a more detailed property set to ensure we get all available properties
    const propertySet = new PropertySet(BasePropertySet.FirstClassProperties);
    propertySet.RequestedBodyType = BodyType.HTML;
    
    // Explicitly add MimeContent to the property set
    propertySet.Add(ItemSchema.MimeContent);
    
    // Convert string ID to ItemId
    const itemId = createItemIdFromString(emailId);
    
    // Use Bind operation (equivalent to GetItem in SOAP)
    const email = await EmailMessage.Bind(service, itemId, propertySet);
    
    // Handle collections safely
    const toRecipients = email.ToRecipients ? 
      Array.from(email.ToRecipients as any).map((r: any) => r.Address) : 
      [];
    
    const ccRecipients = email.CcRecipients ? 
      Array.from(email.CcRecipients as any).map((r: any) => r.Address) : 
      [];
    
    // Get sender information
    let fromAddress = '';
    let fromName = '';
    
    if (email.From) {
      fromAddress = email.From.Address || '';
      fromName = email.From.Name || '';
    } else if (email.Sender) {
      // Try using Sender as fallback
      fromAddress = email.Sender.Address || '';
      fromName = email.Sender.Name || '';
    }
    
    // Try to extract additional information from MIME content if available
    if (email.MimeContent) {
      try {
        const mimeContent = email.MimeContent.ToString();
        console.log(`EWS: Extracting sender from MIME content, length: ${mimeContent.length}`);
        
        // Look for From header in MIME content
        const fromMatch = mimeContent.match(/^From:\s*([^\r\n]+)/im);
        if (fromMatch && fromMatch[1]) {
          const fromHeader = fromMatch[1].trim();
          console.log(`EWS: Found From header: ${fromHeader}`);
          
          // Parse email address and name from the From header
          if (fromHeader.includes('<') && fromHeader.includes('>')) {
            // Format: "Name <email@example.com>"
            fromName = fromHeader.split('<')[0].trim() || fromName;
            fromAddress = fromHeader.match(/<([^>]+)>/)?.[1]?.trim() || fromAddress;
          } else {
            // Format: "email@example.com"
            fromAddress = fromHeader.trim() || fromAddress;
          }
          
          console.log(`EWS: Extracted from MIME - Name: "${fromName}", Address: "${fromAddress}"`);
        }
        
        // If still no sender, try Return-Path
        if (!fromAddress) {
          const returnPathMatch = mimeContent.match(/Return-Path:\s*<([^>]+)>/i);
          if (returnPathMatch && returnPathMatch[1]) {
            fromAddress = returnPathMatch[1].trim();
            if (!fromName) {
              fromName = fromAddress.split('@')[0] || '';
            }
            console.log(`EWS: Found Return-Path: ${fromAddress}`);
          }
        }
        
        // If still no sender, try any email pattern
        if (!fromAddress) {
          const emailMatch = mimeContent.match(/[\w\.-]+@[\w\.-]+\.\w+/);
          if (emailMatch) {
            fromAddress = emailMatch[0];
            if (!fromName) {
              fromName = fromAddress.split('@')[0] || '';
            }
            console.log(`EWS: Found email pattern: ${fromAddress}`);
          }
        }
      } catch (mimeError) {
        console.error('Error extracting from MIME content:', mimeError);
      }
    } else {
      console.log('EWS: MimeContent property not available for this email');
    }
    
    // If still no sender info, try to extract from subject or other properties
    if (!fromAddress && !fromName) {
      // Try to extract from subject if possible
      const subject = email.Subject || '';
      if (subject.toLowerCase().includes('from:')) {
        const match = subject.match(/from:\s*([^\s]+)/i);
        if (match && match[1]) {
          fromAddress = match[1];
          fromName = match[1].split('@')[0] || 'Unknown Sender';
        }
      } else {
        // Use default placeholder
        fromAddress = 'no-sender@weroofamerica.com';
        fromName = 'AWS WorkMail';
      }
    }
    
    // Get the email body
    let emailBody = '';
    if (email.Body) {
      emailBody = email.Body.ToString();
      console.log(`EWS: Email body retrieved, length: ${emailBody.length}`);
    } else {
      console.log('EWS: No body found in email');
    }
    
    // If body is empty but we have MIME content, try to extract body from MIME
    if ((!emailBody || emailBody.length === 0) && email.MimeContent) {
      try {
        const mimeContent = email.MimeContent.ToString();
        console.log(`EWS: Trying to extract body from MIME content, length: ${mimeContent.length}`);
        
        // Try to extract HTML part
        const htmlMatch = mimeContent.match(/Content-Type: text\/html[\s\S]*?(?:\r?\n\r?\n)([\s\S]*?)(?:\r?\n\r?\n--)/i);
        if (htmlMatch && htmlMatch[1]) {
          emailBody = htmlMatch[1].trim();
          console.log(`EWS: Extracted HTML body from MIME, length: ${emailBody.length}`);
        } else {
          // Try to extract plain text part
          const textMatch = mimeContent.match(/Content-Type: text\/plain[\s\S]*?(?:\r?\n\r?\n)([\s\S]*?)(?:\r?\n\r?\n--)/i);
          if (textMatch && textMatch[1]) {
            emailBody = textMatch[1].trim();
            console.log(`EWS: Extracted plain text body from MIME, length: ${emailBody.length}`);
          }
        }
      } catch (mimeError) {
        console.error('Error extracting body from MIME content:', mimeError);
      }
    }
    
    const result = {
      id: email.Id.UniqueId,
      subject: email.Subject,
      from: fromAddress,
      fromName: fromName,
      to: toRecipients,
      cc: ccRecipients,
      body: emailBody,
      receivedDate: email.DateTimeReceived ? email.DateTimeReceived.ToISOString() : undefined,
      hasAttachments: email.HasAttachments,
      isRead: email.IsRead,
      importance: email.Importance,
      // Include additional properties that might be useful
      internetMessageId: email.InternetMessageId,
      size: email.Size
    };
    
    console.log(`EWS: Successfully retrieved email ${emailId}, subject: ${result.subject}, from: ${result.fromName} <${result.from}>, body length: ${result.body ? result.body.length : 0}`);
    
    return result;
  } catch (error) {
    logEWSError(error as Error);
    console.error(`EWS: Failed to fetch email details for ID ${emailId}:`, error);
    
    // Create a basic result with available information
    const fallbackResult = {
      id: emailId,
      subject: '(Unable to retrieve subject)',
      from: 'unknown@weroofamerica.com',
      fromName: 'Unknown Sender',
      to: [],
      cc: [],
      body: '',
      receivedDate: new Date().toISOString(),
      hasAttachments: false,
      isRead: false,
      importance: 'Normal',
      internetMessageId: '',
      size: 0
    };
    
    console.log(`EWS: Returning fallback email data for ${emailId}`);
    return fallbackResult;
  }
};

export const sendEmail = async (
  to: string[],
  subject: string,
  body: string,
  cc?: string[],
  bcc?: string[],
  attachments?: Array<{
    name: string,
    content: string, // Base64 encoded content
    contentType?: string,
    isInline?: boolean,
    contentId?: string
  }>
): Promise<string> => {
  try {
    console.log('Initializing EWS service...');
    const service = await initEWSService();
    
    console.log('Creating email message...');
    const message = new EmailMessage(service);
    message.Subject = subject;
    message.Body = new MessageBody(body);
    
    // Add recipients
    console.log(`Adding ${to.length} recipients...`);
    to.forEach(recipient => {
      console.log(`Adding recipient: ${recipient}`);
      message.ToRecipients.Add(new EmailAddress(recipient));
    });
    
    if (cc) {
      console.log(`Adding ${cc.length} CC recipients...`);
      cc.forEach(recipient => {
        message.CcRecipients.Add(new EmailAddress(recipient));
      });
    }
    
    if (bcc) {
      console.log(`Adding ${bcc.length} BCC recipients...`);
      bcc.forEach(recipient => {
        message.BccRecipients.Add(new EmailAddress(recipient));
      });
    }
    
    // If no attachments, send directly
    if (!attachments || attachments.length === 0) {
      console.log('No attachments, sending email directly...');
      await message.Send();
      console.log('Email sent successfully!');
      return message.Id?.UniqueId || '';
    }
    
    try {
      // With attachments, use the save-first approach
      console.log('Saving message as draft first...');
      await message.Save();
      console.log('Message saved as draft successfully!');
      
      // Add attachments to the saved message
      console.log(`Adding ${attachments.length} attachments to saved message...`);
      for (const attachment of attachments) {
        console.log(`Adding attachment: ${attachment.name}`);
        try {
          // Convert base64 content to Buffer
          const content = Buffer.from(attachment.content, 'base64');
          
          // Add file attachment to the saved message
          const fileAttachment = message.Attachments.AddFileAttachment(attachment.name, content.toString('base64'));
          
          // Set content type if provided
          if (attachment.contentType) {
            console.log(`Setting content type: ${attachment.contentType}`);
            fileAttachment.ContentType = attachment.contentType;
          }
          
          // Set inline property if needed
          if (attachment.isInline) {
            console.log(`Setting attachment as inline with contentId: ${attachment.contentId || attachment.name}`);
            fileAttachment.IsInline = true;
            fileAttachment.ContentId = attachment.contentId || attachment.name;
          }
        } catch (attachmentError) {
          console.error(`Error adding attachment ${attachment.name}:`, attachmentError);
          // Continue with other attachments instead of failing
          console.log('Continuing without this attachment...');
        }
      }
      
      // Update the message with attachments
      console.log('Updating message with attachments...');
      await message.Update(ConflictResolutionMode.AlwaysOverwrite);
      console.log('Message updated with attachments successfully!');
      
      // Send the updated message
      console.log('Sending email with attachments...');
      await message.Send();
      console.log('Email with attachments sent successfully!');
      
      return message.Id?.UniqueId || '';
    } catch (attachmentError) {
      console.error('Error with attachments:', attachmentError);
      
      // If sending with attachments fails, try sending without attachments
      console.log('Trying to send without attachments...');
      const simpleMessage = new EmailMessage(service);
      simpleMessage.Subject = subject;
      simpleMessage.Body = new MessageBody(body);
      
      to.forEach(recipient => {
        simpleMessage.ToRecipients.Add(new EmailAddress(recipient));
      });
      
      if (cc) {
        cc.forEach(recipient => {
          simpleMessage.CcRecipients.Add(new EmailAddress(recipient));
        });
      }
      
      if (bcc) {
        bcc.forEach(recipient => {
          simpleMessage.BccRecipients.Add(new EmailAddress(recipient));
        });
      }
      
      try {
        await simpleMessage.Send();
        console.log('Email sent successfully without attachments!');
        return simpleMessage.Id?.UniqueId || '';
      } catch (simpleError) {
        console.error('Error sending simple email:', simpleError);
        throw new EWSError('Failed to send email', simpleError);
      }
    }
  } catch (error) {
    console.error('Error in sendEmail function:', error);
    logEWSError(error as Error);
    throw new EWSError('Failed to send email', error);
  }
};

export const moveEmail = async (emailId: string, destinationFolderName: WorkMailFolderName): Promise<boolean> => {
  try {
    const service = await initEWSService();
    
    // Convert string ID to ItemId
    const itemId = createItemIdFromString(emailId);
    
    // Get the exchange folder
    const exchangeFolderName = mapWorkMailToExchangeFolder(destinationFolderName);
    
    const email = await EmailMessage.Bind(service, itemId);
    await email.Move(exchangeFolderName);
    
    return true;
  } catch (error) {
    logEWSError(error as Error);
    throw new EWSError('Failed to move email', error);
  }
};

export const deleteEmail = async (emailId: string, hardDelete: boolean = false): Promise<boolean> => {
  try {
    const service = await initEWSService();
    
    // Convert string ID to ItemId
    const itemId = createItemIdFromString(emailId);
    const email = await EmailMessage.Bind(service, itemId);
    
    await email.Delete(hardDelete ? DeleteMode.HardDelete : DeleteMode.SoftDelete);
    
    return true;
  } catch (error) {
    logEWSError(error as Error);
    throw new EWSError('Failed to delete email', error);
  }
};

// Calendar operations
export const getCalendarEvents = async (
  startDate: Date,
  endDate: Date,
  pageSize: number = 50,
  offset: number = 0
): Promise<any[]> => {
  try {
    const service = await initEWSService();
    
    // Create a property set to ensure we get all the properties we need
    const propertySet = new PropertySet(BasePropertySet.FirstClassProperties);
    propertySet.RequestedBodyType = BodyType.Text;
    
    // Use CalendarView instead of ItemView for better calendar event handling
    const calendarFolder = WellKnownFolderName.Calendar;
    const calendarView = new CalendarView(
      DateTime.Parse(startDate.toISOString()),
      DateTime.Parse(endDate.toISOString())
    );
    calendarView.MaxItemsReturned = pageSize;
    
    console.log(`EWS: Searching for calendar events from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Try using FindAppointments with CalendarView first
    let results;
    try {
      results = await service.FindAppointments(calendarFolder, calendarView);
      console.log(`EWS: Found ${results.Items.length} appointments using FindAppointments`);
    } catch (findAppointmentsError) {
      console.warn('EWS: FindAppointments failed, falling back to FindItems:', findAppointmentsError);
      // Fall back to FindItems if FindAppointments fails
      const view = new ItemView(pageSize, offset);
      view.PropertySet = propertySet;
      results = await service.FindItems(calendarFolder, view);
      console.log(`EWS: Found ${results.Items.length} total items in calendar folder using FindItems`);
    }
    
    // Process each event to extract all available information
    const processedEvents = await Promise.all(results.Items.map(async (event) => {
      try {
        // Try to get more detailed information for each event
        const eventId = event.Id;
        let detailedEvent = event;
        
        try {
          // Attempt to get more detailed event information
          detailedEvent = await Item.Bind(service, eventId, propertySet);
        } catch (bindError) {
          console.warn(`EWS: Could not bind to event ${event.Subject || 'Unknown'}, using basic info:`, bindError);
        }
        
        // Extract start and end dates, trying multiple properties
        let eventStart = (detailedEvent as any).Start;
        let eventEnd = (detailedEvent as any).End;
        let isAllDay = (detailedEvent as any).IsAllDayEvent || false;
        
        // If no start date, try to extract from other properties
        if (!eventStart) {
          // Try to extract from DateTimeReceived or DateTimeCreated
          eventStart = (detailedEvent as any).DateTimeReceived || 
                      (detailedEvent as any).DateTimeCreated || 
                      (detailedEvent as any).DateTimeSent;
          
          if (!eventStart && detailedEvent.Subject) {
            // Try to extract date from subject (e.g., "Meeting on 2023-01-01")
            const dateMatch = detailedEvent.Subject.match(/\d{4}-\d{2}-\d{2}/);
            if (dateMatch) {
              try {
                eventStart = new Date(dateMatch[0]);
              } catch (e) {
                console.warn(`EWS: Failed to parse date from subject: ${detailedEvent.Subject}`);
              }
            }
          }
        }
        
        // If still no start date, use current date as fallback for display purposes
        if (!eventStart) {
          console.log(`EWS: Using fallback date for event with no start date: ${detailedEvent.Subject || 'Unknown'}`);
          eventStart = new Date();
        }
        
        // If no end date, set it to start date + 1 hour
        if (!eventEnd && eventStart) {
          const startDate = eventStart instanceof DateTime ? 
            new Date(eventStart.ToISOString()) : 
            (eventStart instanceof Date ? eventStart : new Date(eventStart));
          
          eventEnd = new Date(startDate.getTime() + 60 * 60 * 1000); // Start + 1 hour
        }
        
        // Convert to JavaScript Date objects for comparison
        let eventStartDate: Date;
        let eventEndDate: Date;
        
        if (eventStart instanceof DateTime) {
          eventStartDate = new Date(eventStart.ToISOString());
        } else if (eventStart instanceof Date) {
          eventStartDate = eventStart;
        } else {
          try {
            eventStartDate = new Date(eventStart);
          } catch (e) {
            console.warn(`EWS: Error parsing start date for event: ${detailedEvent.Subject || 'Unknown'}`);
            eventStartDate = new Date(); // Use current date as fallback
          }
        }
        
        if (eventEnd) {
          if (eventEnd instanceof DateTime) {
            eventEndDate = new Date(eventEnd.ToISOString());
          } else if (eventEnd instanceof Date) {
            eventEndDate = eventEnd;
          } else {
            try {
              eventEndDate = new Date(eventEnd);
            } catch (e) {
              eventEndDate = new Date(eventStartDate.getTime() + 60 * 60 * 1000); // Start + 1 hour
            }
          }
        } else {
          eventEndDate = new Date(eventStartDate.getTime() + 60 * 60 * 1000); // Start + 1 hour
        }
        
        // Check if the event overlaps with the requested date range
        const isInRange = (eventStartDate <= endDate && eventEndDate >= startDate);
        
        if (isInRange) {
          console.log(`EWS: Event in range: ${detailedEvent.Subject || 'Unknown'} (${eventStartDate.toISOString()} - ${eventEndDate.toISOString()})`);
          
          // Extract attendees if available
          let attendees: Array<{
            emailAddress: string;
            displayName: string;
            required: boolean;
          }> = [];
          
          if ((detailedEvent as any).RequiredAttendees) {
            try {
              const requiredAttendees = Array.from((detailedEvent as any).RequiredAttendees).map((attendee: any) => ({
                emailAddress: attendee.Address,
                displayName: attendee.Name || attendee.Address.split('@')[0],
                required: true
              }));
              attendees = [...attendees, ...requiredAttendees];
            } catch (e) {
              console.warn('EWS: Error extracting required attendees:', e);
            }
          }
          
          if ((detailedEvent as any).OptionalAttendees) {
            try {
              const optionalAttendees = Array.from((detailedEvent as any).OptionalAttendees).map((attendee: any) => ({
                emailAddress: attendee.Address,
                displayName: attendee.Name || attendee.Address.split('@')[0],
                required: false
              }));
              attendees = [...attendees, ...optionalAttendees];
            } catch (e) {
              console.warn('EWS: Error extracting optional attendees:', e);
            }
          }
          
          // Return formatted event data
          return {
            Id: detailedEvent.Id.UniqueId,
            Subject: detailedEvent.Subject || 'No Subject',
            Start: eventStartDate.toISOString(),
            End: eventEndDate.toISOString(),
            Location: (detailedEvent as any).Location || '',
            Description: (detailedEvent as any).Body?.Text || '',
            IsAllDay: isAllDay,
            Organizer: (detailedEvent as any).Organizer?.Address || '',
            Attendees: attendees.length > 0 ? attendees : undefined
          };
        } else {
          return null; // Skip events outside the date range
        }
      } catch (error) {
        console.warn('Error processing calendar event:', error);
        // Return basic info if there's an error
        return {
          Id: event.Id.UniqueId,
          Subject: event.Subject || 'Unknown Event',
          Start: new Date().toISOString(), // Use current date as fallback
          End: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Current date + 1 hour
          Description: 'Error processing event details'
        };
      }
    }));
    
    // Filter out null events (those outside the date range)
    const validEvents = processedEvents.filter(event => event !== null) as any[];
    console.log(`EWS: Filtered to ${validEvents.length} events in date range`);
    
    return validEvents;
  } catch (error) {
    logEWSError(error as Error);
    throw new EWSError('Failed to fetch calendar events', error);
  }
};

// Get a calendar event by ID
export const getCalendarEventById = async (eventId: string): Promise<any> => {
  try {
    const service = await initEWSService();
    
    const propertySet = new PropertySet(BasePropertySet.FirstClassProperties);
    propertySet.RequestedBodyType = BodyType.HTML;
    
    // Convert string ID to ItemId
    const itemId = createItemIdFromString(eventId);
    const appointment = await Item.Bind(service, itemId, propertySet);
    
    // Extract attendees if available
    const attendees: any[] = [];
    if ((appointment as any).RequiredAttendees) {
      try {
        const requiredAttendees = Array.from((appointment as any).RequiredAttendees as any);
        requiredAttendees.forEach((attendee: any) => {
          attendees.push({
            email: attendee.Address,
            name: attendee.Name,
            type: 'required'
          });
        });
      } catch (error) {
        console.warn('Error extracting required attendees:', error);
      }
    }
    
    if ((appointment as any).OptionalAttendees) {
      try {
        const optionalAttendees = Array.from((appointment as any).OptionalAttendees as any);
        optionalAttendees.forEach((attendee: any) => {
          attendees.push({
            email: attendee.Address,
            name: attendee.Name,
            type: 'optional'
          });
        });
      } catch (error) {
        console.warn('Error extracting optional attendees:', error);
      }
    }
    
    let bodyContent = '';
    try {
      if (appointment.Body) {
        bodyContent = appointment.Body.ToString();
      }
    } catch (error) {
      console.warn('Error extracting event body:', error);
    }
    
    return {
      id: appointment.Id.UniqueId,
      subject: appointment.Subject,
      start: (appointment as any).Start ? (appointment as any).Start.ToISOString() : undefined,
      end: (appointment as any).End ? (appointment as any).End.ToISOString() : undefined,
      location: (appointment as any).Location,
      body: bodyContent,
      isAllDayEvent: (appointment as any).IsAllDayEvent || false,
      organizer: (appointment as any).Organizer?.Address,
      attendees: attendees
    };
  } catch (error) {
    logEWSError(error as Error);
    throw new EWSError('Failed to fetch calendar event details', error);
  }
};

// Create a new calendar event
export const createCalendarEvent = async (
  subject: string,
  start: Date,
  end: Date,
  location?: string,
  body?: string,
  isAllDay: boolean = false,
  attendees?: Array<{ email: string, name?: string, required?: boolean }>
): Promise<string> => {
  try {
    const service = await initEWSService();
    
    // Create a new appointment using the correct class
    // Note: If Appointment class is not available, we'll continue using EmailMessage
    // but with additional properties to make it work as a calendar item
    let appointment;
    try {
      // Try to use Appointment class if available
      const AppointmentClass = require('ews-javascript-api').Appointment;
      appointment = new AppointmentClass(service);
      console.log('EWS: Created appointment using Appointment class');
    } catch (error) {
      // Fall back to EmailMessage if Appointment is not available
      appointment = new EmailMessage(service);
      console.log('EWS: Created appointment using EmailMessage class (fallback)');
    }
    
    appointment.Subject = subject;
    
    // Set start and end times
    (appointment as any).Start = new DateTime(start);
    (appointment as any).End = new DateTime(end);
    
    // Set location if provided
    if (location) {
      (appointment as any).Location = location;
    }
    
    // Set body if provided
    if (body) {
      appointment.Body = new MessageBody(body);
    }
    
    // Set all-day flag
    (appointment as any).IsAllDayEvent = isAllDay;
    
    // Set item class to IPM.Appointment to ensure it's recognized as a calendar item
    (appointment as any).ItemClass = 'IPM.Appointment';
    
    // Add attendees if provided
    if (attendees && attendees.length > 0) {
      attendees.forEach(attendee => {
        const mailbox = new Mailbox(attendee.email);
        if (attendee.name) {
          (mailbox as any).DisplayName = attendee.name;
        }
        
        if (attendee.required === false) {
          (appointment as any).OptionalAttendees.Add(mailbox);
        } else {
          (appointment as any).RequiredAttendees.Add(mailbox);
        }
      });
    }
    
    // Save the appointment
    console.log(`EWS: Saving appointment: ${subject} (${start.toISOString()} - ${end.toISOString()})`);
    await appointment.Save(WellKnownFolderName.Calendar);
    console.log(`EWS: Appointment saved with ID: ${appointment.Id?.UniqueId}`);
    
    return appointment.Id?.UniqueId || '';
  } catch (error) {
    logEWSError(error as Error);
    throw new EWSError('Failed to create calendar event', error);
  }
};

// Update an existing calendar event
export const updateCalendarEvent = async (
  eventId: string,
  updates: {
    subject?: string,
    start?: Date,
    end?: Date,
    location?: string,
    body?: string,
    isAllDay?: boolean
  }
): Promise<boolean> => {
  try {
    const service = await initEWSService();
    
    // Convert string ID to ItemId
    const itemId = createItemIdFromString(eventId);
    const appointment = await Item.Bind(service, itemId, PropertySet.FirstClassProperties);
    
    // Update fields if provided
    if (updates.subject) {
      appointment.Subject = updates.subject;
    }
    
    if (updates.start) {
      (appointment as any).Start = new DateTime(updates.start);
    }
    
    if (updates.end) {
      (appointment as any).End = new DateTime(updates.end);
    }
    
    if (updates.location !== undefined) {
      (appointment as any).Location = updates.location;
    }
    
    if (updates.body) {
      appointment.Body = new MessageBody(updates.body);
    }
    
    if (updates.isAllDay !== undefined) {
      (appointment as any).IsAllDayEvent = updates.isAllDay;
    }
    
    // Save the updated appointment
    await appointment.Update(ConflictResolutionMode.AutoResolve);
    
    return true;
  } catch (error) {
    logEWSError(error as Error);
    throw new EWSError('Failed to update calendar event', error);
  }
};

// Delete a calendar event
export const deleteCalendarEvent = async (eventId: string, cancelMeeting: boolean = false): Promise<boolean> => {
  try {
    const service = await initEWSService();
    
    // Convert string ID to ItemId
    const itemId = createItemIdFromString(eventId);
    const appointment = await Item.Bind(service, itemId, PropertySet.FirstClassProperties);
    
    // Delete the appointment
    if (cancelMeeting) {
      // Send cancellation to attendees
      await (appointment as any).CancelMeeting();
    } else {
      // Just delete without notification
      await appointment.Delete(DeleteMode.MoveToDeletedItems);
    }
    
    return true;
  } catch (error) {
    logEWSError(error as Error);
    throw new EWSError('Failed to delete calendar event', error);
  }
};

// Manage attendees for an event
export const manageEventAttendees = async (
  eventId: string,
  attendeesToAdd?: Array<{ email: string, name?: string, required?: boolean }>,
  attendeesToRemove?: string[]
): Promise<boolean> => {
  try {
    const service = await initEWSService();
    
    // Convert string ID to ItemId
    const itemId = createItemIdFromString(eventId);
    const appointment = await Item.Bind(service, itemId, PropertySet.FirstClassProperties);
    
    // Add new attendees
    if (attendeesToAdd && attendeesToAdd.length > 0) {
      attendeesToAdd.forEach(attendee => {
        const mailbox = new Mailbox(attendee.email);
        if (attendee.name) {
          (mailbox as any).DisplayName = attendee.name;
        }
        
        if (attendee.required === false) {
          (appointment as any).OptionalAttendees.Add(mailbox);
        } else {
          (appointment as any).RequiredAttendees.Add(mailbox);
        }
      });
    }
    
    // Remove attendees
    if (attendeesToRemove && attendeesToRemove.length > 0) {
      // Get current attendees
      const requiredAttendees = Array.from((appointment as any).RequiredAttendees || []);
      const optionalAttendees = Array.from((appointment as any).OptionalAttendees || []);
      
      // Remove from required attendees
      for (const email of attendeesToRemove) {
        const index = requiredAttendees.findIndex((a: any) => a.Address.toLowerCase() === email.toLowerCase());
        if (index !== -1) {
          (appointment as any).RequiredAttendees.Remove(index);
        }
      }
      
      // Remove from optional attendees
      for (const email of attendeesToRemove) {
        const index = optionalAttendees.findIndex((a: any) => a.Address.toLowerCase() === email.toLowerCase());
        if (index !== -1) {
          (appointment as any).OptionalAttendees.Remove(index);
        }
      }
    }
    
    // Save changes
    await appointment.Update(ConflictResolutionMode.AutoResolve);
    
    return true;
  } catch (error) {
    logEWSError(error as Error);
    throw new EWSError('Failed to manage event attendees', error);
  }
};

// Folder operations
export const getFolders = async (): Promise<any[]> => {
  try {
    // Simply return the static list of WorkMail folders
    return [
      { id: WorkMailFolderName.Inbox, displayName: 'Inbox', totalCount: 0, childFolderCount: 0 },
      { id: WorkMailFolderName.SentItems, displayName: 'Sent Items', totalCount: 0, childFolderCount: 0 },
      { id: WorkMailFolderName.DeletedItems, displayName: 'Deleted Items', totalCount: 0, childFolderCount: 0 },
      { id: WorkMailFolderName.Drafts, displayName: 'Drafts', totalCount: 0, childFolderCount: 0 },
      { id: WorkMailFolderName.JunkEmail, displayName: 'Junk Email', totalCount: 0, childFolderCount: 0 }
    ];
  } catch (error) {
    logEWSError(error as Error);
    throw new EWSError('Failed to fetch folders', error);
  }
};

// Search emails
export const searchEmails = async (
  query: string,
  folderIds?: string[],
  pageSize: number = 50,
  offset: number = 0
): Promise<any[]> => {
  try {
    const service = await initEWSService();
    
    const view = new ItemView(pageSize, offset);
    view.PropertySet = new PropertySet(BasePropertySet.FirstClassProperties);
    
    // For simplicity, we'll use a basic search approach
    // Get all emails and filter them manually
    const inboxResults = await service.FindItems(WellKnownFolderName.Inbox, view);
    
    // Filter results that contain the query in subject or sender
    const filteredResults = inboxResults.Items.filter(email => {
      const subject = email.Subject || '';
      const sender = email instanceof EmailMessage ? email.From?.Address || '' : '';
      
      return subject.toLowerCase().includes(query.toLowerCase()) || 
             sender.toLowerCase().includes(query.toLowerCase());
    });
    
    // If folder IDs are specified, search in those folders too
    let folderResults: Item[] = [];
    
    if (folderIds && folderIds.length > 0) {
      for (const folderIdString of folderIds) {
        try {
          // Convert string to FolderId
          const folderId = createFolderIdFromString(folderIdString);
          const folder = await Folder.Bind(service, folderId);
          const folderResult = await service.FindItems(folder.Id, view);
          
          // Filter results
          const filteredFolderResults = folderResult.Items.filter(email => {
            const subject = email.Subject || '';
            const sender = email instanceof EmailMessage ? email.From?.Address || '' : '';
            
            return subject.toLowerCase().includes(query.toLowerCase()) || 
                   sender.toLowerCase().includes(query.toLowerCase());
          });
          
          folderResults.push(...filteredFolderResults);
        } catch (error) {
          console.warn(`Error searching folder ${folderIdString}:`, error);
          // Continue with other folders
        }
      }
    }
    
    // Combine results
    const allResults = [...filteredResults, ...folderResults];
    
    // Sort by received date (newest first)
    allResults.sort((a, b) => {
      const dateA = a.DateTimeReceived ? a.DateTimeReceived.TotalMilliSeconds : 0;
      const dateB = b.DateTimeReceived ? b.DateTimeReceived.TotalMilliSeconds : 0;
      return dateB - dateA;
    });
    
    // Apply pagination manually
    const paginatedResults = allResults.slice(offset, offset + pageSize);
    
    return paginatedResults.map(email => ({
      id: email.Id.UniqueId,
      subject: email.Subject,
      from: email instanceof EmailMessage ? email.From?.Address : undefined,
      receivedDate: email.DateTimeReceived ? email.DateTimeReceived.ToISOString() : undefined,
      hasAttachments: email.HasAttachments,
      isRead: email instanceof EmailMessage ? email.IsRead : undefined
    }));
  } catch (error) {
    logEWSError(error as Error);
    throw new EWSError('Failed to search emails', error);
  }
};

// Contacts operations
export const getContacts = async (
  pageSize: number = 50,
  offset: number = 0
): Promise<any[]> => {
  try {
    const service = await initEWSService();
    
    const view = new ItemView(pageSize, offset);
    // Use a more comprehensive property set to ensure we get all the properties
    const propertySet = new PropertySet(BasePropertySet.FirstClassProperties);
    propertySet.RequestedBodyType = BodyType.Text;
    view.PropertySet = propertySet;
    
    const contactsFolder = WellKnownFolderName.Contacts;
    const results = await service.FindItems(contactsFolder, view);
    
    return results.Items.map(contact => {
      // Extract email from body if available
      let emailAddress = '';
      let businessPhone = '';
      let mobilePhone = '';
      let jobTitle = '';
      let company = '';
      let department = '';
      let notes = '';
      
      try {
        // Check if Body property exists and is accessible
        let bodyText = '';
        try {
          if (contact.Body) {
            // Use the toString method if available
            bodyText = typeof contact.Body.ToString === 'function' 
              ? contact.Body.ToString() 
              : String(contact.Body);
          }
        } catch (e) {
          console.warn('Error accessing contact body:', e);
          // If there's an error accessing the Body property, continue with empty string
          bodyText = '';
        }
        
        if (bodyText) {
          // Extract email - try different patterns
          let emailMatch = bodyText.match(/Email:\s*([^\n]+)/i);
          if (!emailMatch) {
            emailMatch = bodyText.match(/Email Address:\s*([^\n]+)/i);
          }
          if (!emailMatch) {
            // Try to find any email pattern in the body
            const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
            const foundEmail = bodyText.match(emailRegex);
            if (foundEmail) {
              emailMatch = [foundEmail[0], foundEmail[0]];
            }
          }
          if (emailMatch && emailMatch[1]) {
            emailAddress = emailMatch[1].trim();
          }
          
          // Extract business phone - try different patterns
          let businessPhoneMatch = bodyText.match(/Business Phone:\s*([^\n]+)/i);
          if (!businessPhoneMatch) {
            businessPhoneMatch = bodyText.match(/Office Phone:\s*([^\n]+)/i);
          }
          if (!businessPhoneMatch) {
            businessPhoneMatch = bodyText.match(/Work Phone:\s*([^\n]+)/i);
          }
          if (businessPhoneMatch && businessPhoneMatch[1]) {
            businessPhone = businessPhoneMatch[1].trim();
          }
          
          // Extract mobile phone - try different patterns
          let mobilePhoneMatch = bodyText.match(/Mobile Phone:\s*([^\n]+)/i);
          if (!mobilePhoneMatch) {
            mobilePhoneMatch = bodyText.match(/Cell Phone:\s*([^\n]+)/i);
          }
          if (!mobilePhoneMatch) {
            mobilePhoneMatch = bodyText.match(/Mobile:\s*([^\n]+)/i);
          }
          if (mobilePhoneMatch && mobilePhoneMatch[1]) {
            mobilePhone = mobilePhoneMatch[1].trim();
          }
          
          // Extract job title - try different patterns
          let jobTitleMatch = bodyText.match(/Job Title:\s*([^\n]+)/i);
          if (!jobTitleMatch) {
            jobTitleMatch = bodyText.match(/Title:\s*([^\n]+)/i);
          }
          if (!jobTitleMatch) {
            jobTitleMatch = bodyText.match(/Position:\s*([^\n]+)/i);
          }
          if (jobTitleMatch && jobTitleMatch[1]) {
            jobTitle = jobTitleMatch[1].trim();
          }
          
          // Extract company - try different patterns
          let companyMatch = bodyText.match(/Company:\s*([^\n]+)/i);
          if (!companyMatch) {
            companyMatch = bodyText.match(/Organization:\s*([^\n]+)/i);
          }
          if (!companyMatch) {
            companyMatch = bodyText.match(/Employer:\s*([^\n]+)/i);
          }
          if (companyMatch && companyMatch[1]) {
            company = companyMatch[1].trim();
          }
          
          // Extract department - try different patterns
          let departmentMatch = bodyText.match(/Department:\s*([^\n]+)/i);
          if (!departmentMatch) {
            departmentMatch = bodyText.match(/Division:\s*([^\n]+)/i);
          }
          if (!departmentMatch) {
            departmentMatch = bodyText.match(/Team:\s*([^\n]+)/i);
          }
          if (departmentMatch && departmentMatch[1]) {
            department = departmentMatch[1].trim();
          }
          
          // Extract notes
          const notesMatch = bodyText.match(/Notes:\s*([\s\S]+)$/i);
          if (notesMatch && notesMatch[1]) {
            notes = notesMatch[1].trim();
          }
        }
      } catch (error) {
        console.warn('Error extracting contact details:', error);
      }
      
      return {
        id: contact.Id.UniqueId,
        displayName: contact.Subject || '',
        emailAddress,
        businessPhone,
        mobilePhone,
        jobTitle,
        company,
        department,
        notes
      };
    });
  } catch (error) {
    logEWSError(error as Error);
    throw new EWSError('Failed to fetch contacts', error);
  }
};

export const getContactById = async (contactId: string): Promise<any> => {
  try {
    const service = await initEWSService();
    
    const propertySet = new PropertySet(BasePropertySet.FirstClassProperties);
    propertySet.RequestedBodyType = BodyType.Text;
    
    // Convert string ID to ItemId
    const itemId = createItemIdFromString(contactId);
    const contact = await Item.Bind(service, itemId, propertySet);
    
    // Extract contact details from body
    let emailAddress = '';
    let businessPhone = '';
    let mobilePhone = '';
    let jobTitle = '';
    let company = '';
    let department = '';
    let notes = '';
    
    try {
      // Check if Body property exists and is accessible
      let bodyText = '';
      try {
        if (contact.Body) {
          // Use the toString method if available
          bodyText = typeof contact.Body.ToString === 'function' 
            ? contact.Body.ToString() 
            : String(contact.Body);
        }
      } catch (e) {
        console.warn('Error accessing contact body:', e);
        // If there's an error accessing the Body property, continue with empty string
        bodyText = '';
      }
      
      if (bodyText) {
        // Extract email - try different patterns
        let emailMatch = bodyText.match(/Email:\s*([^\n]+)/i);
        if (!emailMatch) {
          emailMatch = bodyText.match(/Email Address:\s*([^\n]+)/i);
        }
        if (!emailMatch) {
          // Try to find any email pattern in the body
          const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
          const foundEmail = bodyText.match(emailRegex);
          if (foundEmail) {
            emailMatch = [foundEmail[0], foundEmail[0]];
          }
        }
        if (emailMatch && emailMatch[1]) {
          emailAddress = emailMatch[1].trim();
        }
        
        // Extract business phone - try different patterns
        let businessPhoneMatch = bodyText.match(/Business Phone:\s*([^\n]+)/i);
        if (!businessPhoneMatch) {
          businessPhoneMatch = bodyText.match(/Office Phone:\s*([^\n]+)/i);
        }
        if (!businessPhoneMatch) {
          businessPhoneMatch = bodyText.match(/Work Phone:\s*([^\n]+)/i);
        }
        if (businessPhoneMatch && businessPhoneMatch[1]) {
          businessPhone = businessPhoneMatch[1].trim();
        }
        
        // Extract mobile phone - try different patterns
        let mobilePhoneMatch = bodyText.match(/Mobile Phone:\s*([^\n]+)/i);
        if (!mobilePhoneMatch) {
          mobilePhoneMatch = bodyText.match(/Cell Phone:\s*([^\n]+)/i);
        }
        if (!mobilePhoneMatch) {
          mobilePhoneMatch = bodyText.match(/Mobile:\s*([^\n]+)/i);
        }
        if (mobilePhoneMatch && mobilePhoneMatch[1]) {
          mobilePhone = mobilePhoneMatch[1].trim();
        }
        
        // Extract job title - try different patterns
        let jobTitleMatch = bodyText.match(/Job Title:\s*([^\n]+)/i);
        if (!jobTitleMatch) {
          jobTitleMatch = bodyText.match(/Title:\s*([^\n]+)/i);
        }
        if (!jobTitleMatch) {
          jobTitleMatch = bodyText.match(/Position:\s*([^\n]+)/i);
        }
        if (jobTitleMatch && jobTitleMatch[1]) {
          jobTitle = jobTitleMatch[1].trim();
        }
        
        // Extract company - try different patterns
        let companyMatch = bodyText.match(/Company:\s*([^\n]+)/i);
        if (!companyMatch) {
          companyMatch = bodyText.match(/Organization:\s*([^\n]+)/i);
        }
        if (!companyMatch) {
          companyMatch = bodyText.match(/Employer:\s*([^\n]+)/i);
        }
        if (companyMatch && companyMatch[1]) {
          company = companyMatch[1].trim();
        }
        
        // Extract department - try different patterns
        let departmentMatch = bodyText.match(/Department:\s*([^\n]+)/i);
        if (!departmentMatch) {
          departmentMatch = bodyText.match(/Division:\s*([^\n]+)/i);
        }
        if (!departmentMatch) {
          departmentMatch = bodyText.match(/Team:\s*([^\n]+)/i);
        }
        if (departmentMatch && departmentMatch[1]) {
          department = departmentMatch[1].trim();
        }
        
        // Extract notes
        const notesMatch = bodyText.match(/Notes:\s*([\s\S]+)$/i);
        if (notesMatch && notesMatch[1]) {
          notes = notesMatch[1].trim();
        }
      }
    } catch (error) {
      console.warn('Error extracting contact details:', error);
    }
    
    return {
      id: contact.Id.UniqueId,
      displayName: contact.Subject || '',
      emailAddress,
      businessPhone,
      mobilePhone,
      jobTitle,
      company,
      department,
      notes
    };
  } catch (error) {
    logEWSError(error as Error);
    throw new EWSError('Failed to fetch contact details', error);
  }
};

export const createContact = async (
  displayName: string,
  emailAddress: string,
  businessPhone?: string,
  mobilePhone?: string,
  jobTitle?: string,
  company?: string,
  department?: string,
  notes?: string
): Promise<string> => {
  try {
    console.log('Creating contact with:', { displayName, emailAddress });
    
    const service = await initEWSService();
    console.log('EWS service initialized');
    
    // Create a new contact using EmailMessage instead of Item
    // This is a workaround since the EWS JavaScript API doesn't have a dedicated Contact class
    const contact = new EmailMessage(service);
    console.log('Contact item created');
    
    contact.Subject = displayName;
    console.log('Subject set');
    
    // Set email address
    if (emailAddress) {
      console.log('Setting email address');
      try {
        // Set the email address in the body
        contact.Body = new MessageBody(`Email: ${emailAddress}`);
        console.log('Email address set in body');
      } catch (error) {
        console.warn('Error setting email address:', error);
      }
    }
    
    // Add phone numbers to the body if provided
    let bodyText = emailAddress ? `Email: ${emailAddress}\n\n` : '';
    
    if (businessPhone) {
      bodyText += `Business Phone: ${businessPhone}\n`;
    }
    
    if (mobilePhone) {
      bodyText += `Mobile Phone: ${mobilePhone}\n`;
    }
    
    if (jobTitle) {
      bodyText += `Job Title: ${jobTitle}\n`;
    }
    
    if (company) {
      bodyText += `Company: ${company}\n`;
    }
    
    if (department) {
      bodyText += `Department: ${department}\n`;
    }
    
    // Add notes if provided
    if (notes) {
      bodyText += `\nNotes:\n${notes}`;
    }
    
    // Set the body with all the contact information
    contact.Body = new MessageBody(bodyText);
    console.log('Contact details set in body');
    
    // Save the contact to the Contacts folder
    console.log('Saving contact to Contacts folder');
    await contact.Save(WellKnownFolderName.Contacts);
    console.log('Contact saved successfully');
    
    return contact.Id?.UniqueId || '';
  } catch (error) {
    console.error('Detailed contact creation error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    logEWSError(error as Error);
    throw new EWSError('Failed to create contact: ' + (error instanceof Error ? error.message : String(error)), error);
  }
};

export const updateContact = async (
  contactId: string,
  updates: {
    displayName?: string,
    emailAddress?: string,
    businessPhone?: string,
    mobilePhone?: string,
    jobTitle?: string,
    company?: string,
    department?: string,
    notes?: string
  }
): Promise<boolean> => {
  try {
    const service = await initEWSService();
    
    // Convert string ID to ItemId
    const itemId = createItemIdFromString(contactId);
    const contact = await Item.Bind(service, itemId, PropertySet.FirstClassProperties);
    
    // Update fields if provided
    if (updates.displayName) {
      contact.Subject = updates.displayName;
    }
    
    if (updates.emailAddress) {
      // Use a different approach to set email address
      try {
        // Try to set the primary email address
        (contact as any).EmailAddress1 = updates.emailAddress;
      } catch (error) {
        console.warn('Error setting email address:', error);
      }
    }
    
    // Update phone numbers
    if (updates.businessPhone || updates.mobilePhone) {
      (contact as any).PhoneNumbers = (contact as any).PhoneNumbers || {};
      
      if (updates.businessPhone) {
        (contact as any).PhoneNumbers.BusinessPhone = updates.businessPhone;
      }
      
      if (updates.mobilePhone) {
        (contact as any).PhoneNumbers.MobilePhone = updates.mobilePhone;
      }
    }
    
    // Update job details
    if (updates.jobTitle) {
      (contact as any).JobTitle = updates.jobTitle;
    }
    
    if (updates.company) {
      (contact as any).CompanyName = updates.company;
    }
    
    if (updates.department) {
      (contact as any).Department = updates.department;
    }
    
    // Update notes
    if (updates.notes) {
      contact.Body = new MessageBody(updates.notes);
    }
    
    // Save the updated contact
    await contact.Update(ConflictResolutionMode.AutoResolve);
    
    return true;
  } catch (error) {
    logEWSError(error as Error);
    throw new EWSError('Failed to update contact', error);
  }
};

export const deleteContact = async (contactId: string): Promise<boolean> => {
  try {
    const service = await initEWSService();
    
    // Convert string ID to ItemId
    const itemId = createItemIdFromString(contactId);
    const contact = await Item.Bind(service, itemId, PropertySet.FirstClassProperties);
    
    // Delete the contact
    await contact.Delete(DeleteMode.MoveToDeletedItems);
    
    return true;
  } catch (error) {
    logEWSError(error as Error);
    throw new EWSError('Failed to delete contact', error);
  }
};

export const searchContacts = async (
  query: string,
  pageSize: number = 50,
  offset: number = 0
): Promise<any[]> => {
  try {
    const service = await initEWSService();
    
    const view = new ItemView(pageSize, offset);
    view.PropertySet = new PropertySet(BasePropertySet.FirstClassProperties);
    
    // Get all contacts and filter them manually
    const contactsFolder = WellKnownFolderName.Contacts;
    const results = await service.FindItems(contactsFolder, view);
    
    // Filter results that contain the query in display name, email, or company
    const filteredResults = results.Items.filter(contact => {
      const displayName = contact.Subject || '';
      const email = (contact as any).EmailAddresses ? (contact as any).EmailAddresses[0]?.Address || '' : '';
      const company = (contact as any).CompanyName || '';
      
      return displayName.toLowerCase().includes(query.toLowerCase()) || 
             email.toLowerCase().includes(query.toLowerCase()) ||
             company.toLowerCase().includes(query.toLowerCase());
    });
    
    // Apply pagination manually
    const paginatedResults = filteredResults.slice(offset, offset + pageSize);
    
    return paginatedResults.map(contact => ({
      id: contact.Id.UniqueId,
      displayName: contact.Subject || '',
      emailAddress: (contact as any).EmailAddresses ? (contact as any).EmailAddresses[0]?.Address : '',
      businessPhone: (contact as any).PhoneNumbers ? (contact as any).PhoneNumbers.BusinessPhone : '',
      mobilePhone: (contact as any).PhoneNumbers ? (contact as any).PhoneNumbers.MobilePhone : '',
      jobTitle: (contact as any).JobTitle || '',
      company: (contact as any).CompanyName || '',
      department: (contact as any).Department || ''
    }));
  } catch (error) {
    logEWSError(error as Error);
    throw new EWSError('Failed to search contacts', error);
  }
}; 