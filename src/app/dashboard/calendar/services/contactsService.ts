import { toast } from 'react-hot-toast';

export interface Contact {
  id: string;
  displayName: string;
  emailAddress: string;
  businessPhone?: string;
  mobilePhone?: string;
  jobTitle?: string;
  company?: string;
  department?: string;
  notes?: string;
}

/**
 * Fetch contacts from the API
 * @param page Page number (1-indexed)
 * @param pageSize Number of contacts per page
 * @returns Array of contacts
 */
export const fetchContacts = async (
  page: number = 1,
  pageSize: number = 50
): Promise<Contact[]> => {
  try {
    const response = await fetch(`/api/contacts?page=${page}&pageSize=${pageSize}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch contacts');
    }
    
    const data = await response.json();
    return data.contacts;
  } catch (error) {
    console.error('Error fetching contacts:', error);
    toast.error('Failed to load contacts');
    return [];
  }
};

/**
 * Search contacts by query
 * @param query Search query
 * @param page Page number (1-indexed)
 * @param pageSize Number of contacts per page
 * @returns Array of contacts matching the query
 */
export const searchContacts = async (
  query: string,
  page: number = 1,
  pageSize: number = 50
): Promise<Contact[]> => {
  try {
    const response = await fetch(`/api/contacts/search?query=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to search contacts');
    }
    
    const data = await response.json();
    return data.contacts;
  } catch (error) {
    console.error('Error searching contacts:', error);
    toast.error('Failed to search contacts');
    return [];
  }
};

/**
 * Get a contact by ID
 * @param id Contact ID
 * @returns Contact details or null if not found
 */
export const getContactById = async (id: string): Promise<Contact | null> => {
  try {
    const response = await fetch(`/api/contacts/${id}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch contact');
    }
    
    const data = await response.json();
    return data.contact;
  } catch (error) {
    console.error('Error fetching contact:', error);
    toast.error('Failed to load contact details');
    return null;
  }
}; 