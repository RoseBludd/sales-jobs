'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check, User } from 'lucide-react';
import { fetchContacts, searchContacts, Contact } from '../services/contactsService';

interface ContactSelectorProps {
  selectedContacts: Contact[];
  onSelectContact: (contact: Contact) => void;
  onRemoveContact: (contactId: string) => void;
  maxHeight?: string;
}

export default function ContactSelector({
  selectedContacts,
  onSelectContact,
  onRemoveContact,
  maxHeight = '300px'
}: ContactSelectorProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load initial contacts
  useEffect(() => {
    const loadContacts = async () => {
      setIsLoading(true);
      try {
        const contactsList = await fetchContacts();
        setContacts(contactsList);
        setFilteredContacts(contactsList);
      } catch (error) {
        console.error('Failed to load contacts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContacts();
  }, []);

  // Handle search query changes
  useEffect(() => {
    const handleSearch = async () => {
      if (searchQuery.trim() === '') {
        setFilteredContacts(contacts);
        return;
      }

      setIsLoading(true);
      try {
        if (searchQuery.length >= 2) {
          // If query is substantial, search via API
          const results = await searchContacts(searchQuery);
          setFilteredContacts(results);
        } else {
          // Otherwise filter locally
          const filtered = contacts.filter(contact => 
            contact.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contact.emailAddress.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setFilteredContacts(filtered);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimeout = setTimeout(handleSearch, 300);
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery, contacts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if a contact is already selected
  const isContactSelected = (contactId: string) => {
    return selectedContacts.some(contact => contact.id === contactId);
  };

  return (
    <div className="w-full relative" ref={dropdownRef}>
      {/* Selected contacts display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedContacts.map(contact => (
          <div 
            key={contact.id}
            className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-2 py-1 rounded-full text-sm"
          >
            <span>{contact.displayName}</span>
            <button
              type="button"
              onClick={() => onRemoveContact(contact.id)}
              className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Search input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search size={16} className="text-gray-500 dark:text-gray-400" />
        </div>
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {/* Dropdown with contacts */}
      {isOpen && (
        <div 
          className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg overflow-hidden"
          style={{ maxHeight }}
        >
          <div className="overflow-y-auto" style={{ maxHeight }}>
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredContacts.length > 0 ? (
              <ul className="py-1">
                {filteredContacts.map(contact => (
                  <li key={contact.id}>
                    <button
                      type="button"
                      className={`flex items-center justify-between w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        isContactSelected(contact.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                      }`}
                      onClick={() => {
                        if (!isContactSelected(contact.id)) {
                          onSelectContact(contact);
                        }
                      }}
                      disabled={isContactSelected(contact.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <User size={16} className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <div>
                          <div className="font-medium">{contact.displayName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{contact.emailAddress}</div>
                        </div>
                      </div>
                      {isContactSelected(contact.id) && (
                        <Check size={16} className="text-blue-500" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No contacts found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 