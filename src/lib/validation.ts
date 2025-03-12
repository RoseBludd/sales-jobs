import { z } from 'zod';

// Email validation schemas
export const emailListQuerySchema = z.object({
  folder: z.string().optional(),
  pageSize: z.coerce.number().min(1).max(100).default(50),
  page: z.coerce.number().min(1).default(1),
  sync: z.boolean().optional().default(false),
});

export const emailIdSchema = z.object({
  id: z.string(),
});

export const sendEmailSchema = z.object({
  to: z.array(z.string().email()).min(1),
  subject: z.string().min(1),
  body: z.string(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  attachments: z.array(
    z.object({
      name: z.string(),
      content: z.string(), // Base64 encoded content
      contentType: z.string(),
    })
  ).optional(),
});

export const moveEmailSchema = z.object({
  emailId: z.string(),
  destinationFolderId: z.string(),
});

export const deleteEmailSchema = z.object({
  emailId: z.string(),
  hardDelete: z.boolean().default(false),
});

export const searchEmailSchema = z.object({
  query: z.string().min(1),
  folderIds: z.array(z.string()).optional(),
  pageSize: z.coerce.number().min(1).max(100).default(50),
  page: z.coerce.number().min(1).default(1),
});

// Calendar validation schemas
export const calendarEventsQuerySchema = z.object({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  pageSize: z.coerce.number().min(1).max(100).default(50),
  page: z.coerce.number().min(1).default(1),
});

export const calendarEventSchema = z.object({
  subject: z.string().min(1),
  start: z.string().transform(str => new Date(str)),
  end: z.string().transform(str => new Date(str)),
  location: z.string().optional(),
  body: z.string().optional(),
  isAllDay: z.boolean().default(false),
  attendees: z.array(
    z.object({
      email: z.string().email(),
      name: z.string().optional(),
      required: z.boolean().default(true),
    })
  ).optional(),
  recurrence: z.object({
    pattern: z.enum(['Daily', 'Weekly', 'Monthly']),
    interval: z.number().min(1),
    endDate: z.string().transform(str => new Date(str)).optional(),
  }).optional(),
});

export const eventIdSchema = z.object({
  id: z.string(),
});

// Contacts validation schemas
export const contactsQuerySchema = z.object({
  pageSize: z.coerce.number().min(1).max(100).default(50),
  page: z.coerce.number().min(1).default(1),
});

export const contactSchema = z.object({
  displayName: z.string().min(1),
  emailAddress: z.string().email(),
  businessPhone: z.string().optional(),
  mobilePhone: z.string().optional(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  department: z.string().optional(),
  notes: z.string().optional(),
});

export const contactIdSchema = z.object({
  id: z.string(),
});

export const searchContactsSchema = z.object({
  query: z.string().min(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
  page: z.coerce.number().min(1).default(1),
}); 