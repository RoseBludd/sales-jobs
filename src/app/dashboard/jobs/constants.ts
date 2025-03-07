import { Classification } from './types';

// Cache constants
export const CACHE_KEY_PREFIX = 'dashboard_jobs_';
export const CACHE_DURATION = 1000 * 60 * 60; // 1 hour
export const ITEMS_PER_PAGE = 10;

// Status classifications mapping
export const STATUS_CLASSIFICATIONS: Record<string, Classification> = {
  'New Jobs': 'Prospects',
  'Previous Phase - Google Export': 'Prospects',
  'Researching/Need to call': 'Prospects',
  'Job Lost': 'Prospects',
  'No Damage/Keep an eye out': 'Prospects',
  'Gone Cold': 'Prospects',
  'Marketing - Future Sales': 'Prospects',
  'Authorized Inspection/Lead': 'Prospects',
  'Inspected / Schedule Close': 'Prospects',
  'Presented With Dec. Maker/s': 'Prospects',
  'Follow Up - Cold': 'Prospects',
  'Follow Up - Warm': 'Prospects',
  'Follow Up - Hot!': 'Prospects',
  'File Review Failed': 'Prospects',
  'File Review Team 3 days': 'Sold',
  'Need cash bid': 'Estimating',
  'Estimating': 'Estimating',
  'Estimate Completed': 'Estimating',
  'Estimate Approved': 'Estimating',
  'Estimate Rejected': 'Estimating',
  'Supplement Needed': 'Estimating',
  'Supplement Completed': 'Estimating',
  'Supplement Approved': 'Estimating',
  'Supplement Rejected': 'Estimating',
  'Production': 'Production',
  'Production - Scheduled': 'Production',
  'Production - In Progress': 'Production',
  'Production - Completed': 'Production',
  'Production - Inspection': 'Production',
  'Accounting': 'Accounting',
  'Accounting - Invoice Sent': 'Accounting',
  'Accounting - Payment Received': 'Accounting',
  'Completed': 'Completed',
  'Completed - Paid': 'Completed'
}; 