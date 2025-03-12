'use client';

import React from 'react';
import { Users, User, Mail, Phone } from 'lucide-react';
import { Contact } from '../services/contactsService';

interface AttendeesListProps {
  attendees: Contact[];
  compact?: boolean;
}

export default function AttendeesList({ attendees, compact = false }: AttendeesListProps) {
  if (!attendees || attendees.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-start gap-3">
        <Users className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attendees</p>
          <ul className="space-y-1">
            {attendees.map((attendee, index) => (
              <li key={index} className="text-gray-900 dark:text-white text-sm">
                {attendee.displayName} ({attendee.emailAddress})
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
        <Users className="w-5 h-5" />
        <span>Attendees ({attendees.length})</span>
      </h3>
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {attendees.map((attendee, index) => (
          <li key={index} className="py-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {attendee.displayName}
                </p>
                <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:gap-x-4">
                  <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Mail className="flex-shrink-0 mr-1.5 h-4 w-4" />
                    <span>{attendee.emailAddress}</span>
                  </div>
                  {attendee.businessPhone && (
                    <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Phone className="flex-shrink-0 mr-1.5 h-4 w-4" />
                      <span>{attendee.businessPhone}</span>
                    </div>
                  )}
                </div>
                {attendee.jobTitle && attendee.company && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {attendee.jobTitle} at {attendee.company}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
} 