'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ContactSelector from './ContactSelector';
import { Contact } from '../services/contactsService';

interface EventFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: EventFormData) => Promise<void>;
  initialData?: Partial<EventFormData>;
  isEditing?: boolean;
}

export interface EventFormData {
  id?: string;
  subject: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  isAllDay: boolean;
  attendees: Contact[];
}

export default function EventForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing = false
}: EventFormProps) {
  const [formData, setFormData] = useState<EventFormData>({
    subject: '',
    start: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:MM
    end: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16), // 1 hour later
    location: '',
    description: '',
    isAllDay: false,
    attendees: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with initial data if provided
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        // Ensure dates are in the correct format for datetime-local input
        start: initialData.start ? new Date(initialData.start).toISOString().slice(0, 16) : prev.start,
        end: initialData.end ? new Date(initialData.end).toISOString().slice(0, 16) : prev.end,
        attendees: initialData.attendees || []
      }));
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      toast.success(isEditing ? 'Event updated successfully' : 'Event created successfully');
      onClose();
    } catch (error) {
      console.error('Failed to save event:', error);
      toast.error(isEditing ? 'Failed to update event' : 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    setFormData(prev => ({
      ...prev,
      attendees: [...prev.attendees, contact]
    }));
  };

  const handleRemoveContact = (contactId: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.filter(contact => contact.id !== contactId)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Event' : 'Create New Event'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject *
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Event subject"
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isAllDay"
              name="isAllDay"
              checked={formData.isAllDay}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isAllDay" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              All day event
            </label>
          </div>

          {/* Date/Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start {formData.isAllDay ? 'Date' : 'Time'} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  {formData.isAllDay ? <Calendar size={16} className="text-gray-500" /> : <Clock size={16} className="text-gray-500" />}
                </div>
                <input
                  type={formData.isAllDay ? "date" : "datetime-local"}
                  id="start"
                  name="start"
                  value={formData.isAllDay ? formData.start.split('T')[0] : formData.start}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="end" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End {formData.isAllDay ? 'Date' : 'Time'} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  {formData.isAllDay ? <Calendar size={16} className="text-gray-500" /> : <Clock size={16} className="text-gray-500" />}
                </div>
                <input
                  type={formData.isAllDay ? "date" : "datetime-local"}
                  id="end"
                  name="end"
                  value={formData.isAllDay ? formData.end.split('T')[0] : formData.end}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <MapPin size={16} className="text-gray-500" />
              </div>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location || ''}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Event location"
              />
            </div>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <div className="flex items-center gap-1">
                <Users size={16} />
                <span>Attendees</span>
              </div>
            </label>
            <ContactSelector
              selectedContacts={formData.attendees}
              onSelectContact={handleSelectContact}
              onRemoveContact={handleRemoveContact}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <div className="flex items-center gap-1">
                <Info size={16} />
                <span>Description</span>
              </div>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Event description"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                isEditing ? 'Update Event' : 'Create Event'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 