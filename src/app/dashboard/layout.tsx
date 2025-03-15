'use client';

import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { CalendarEvent } from '@/app/api/calendar/types';
import { Toaster } from 'react-hot-toast';

// Import sidebar contents
import CalendarSidebarContent from './calendar/sidebar';
import EmailSidebarContent from './email/sidebar';
import JobsSidebarContent from './jobs/sidebar';

// Import context providers
import { EmailProvider } from './email/context/EmailProvider';
import { CalendarProvider } from './calendar/context/CalendarProvider';

interface LayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // For calendar sidebar
  const mockEvents: CalendarEvent[] = [
    { 
      Id: '1', 
      Subject: 'Team Meeting', 
      Start: new Date(2025, 2, 15, 10, 0).toISOString(), 
      End: new Date(2025, 2, 15, 11, 0).toISOString(), 
      Description: 'Weekly team sync' 
    },
    { 
      Id: '2', 
      Subject: 'Client Call', 
      Start: new Date(2025, 2, 16, 14, 0).toISOString(), 
      End: new Date(2025, 2, 16, 15, 0).toISOString(), 
      Description: 'Project status update' 
    },
    { 
      Id: '3', 
      Subject: 'Deployment Review', 
      Start: new Date(2025, 2, 18, 13, 0).toISOString(), 
      End: new Date(2025, 2, 18, 14, 30).toISOString(), 
      Description: 'Reviewing latest deployment' 
    }
  ];

  // Get current route title
  const getRouteTitle = () => {
    switch (true) {
      case pathname === '/dashboard':
        return 'Dashboard';
      case pathname.includes('/dashboard/jobs'):
        return 'Jobs';
      case pathname.includes('/dashboard/jobs/fillout'):
        return 'New Job';
      case pathname.includes('/dashboard/jobs/temp-jobs'):
        return 'Targets';
      case pathname.includes('/dashboard/jobs/notes'):
        return 'Notes';
      case pathname.includes('/dashboard/email/inbox'):
        return 'Email';
      case pathname.includes('/dashboard/email/sent'):
        return 'Email';
      case pathname.includes('/dashboard/email/draft'):
        return 'Email';
      case pathname.includes('/dashboard/email/trash'):
        return 'Email';
      case pathname.includes('/dashboard/email/spam'):
        return 'Email';
      case pathname.includes('/dashboard/calendar'):
        return 'Calendar';
      case pathname.includes('/dashboard/change-password'):
        return 'Change Password';
      default:
        return 'Dashboard';
    }
  };

  // Render sidebar content based on current route
  const renderSidebarContent = () => {
    switch (true) {
      case pathname.includes('/dashboard/calendar'):
        return <CalendarSidebarContent events={mockEvents} />;
      case pathname.includes('/dashboard/email'):
        return <EmailSidebarContent />;
      case pathname.includes('/dashboard/jobs'):
        return <JobsSidebarContent />;
      default:
        return null;
    }
  };

  // Determine which provider to use based on the current route
  const getLayoutContent = () => {
    const layoutContent = (
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        {/* Backdrop for mobile when sidebar is open */}
        <div 
          className={`fixed inset-0 bg-black transition-opacity duration-300 ease-in-out ${
            sidebarOpen ? 'opacity-50 z-20' : 'opacity-0 -z-10'
          } md:hidden`}
          onClick={toggleSidebar}
          aria-hidden="true"
        />
        
        <Sidebar 
          sidebarOpen={sidebarOpen} 
          toggleSidebar={toggleSidebar}
          currentPath={pathname}
        >
          {renderSidebarContent()}
        </Sidebar>
        
        <div className={`flex-1 flex flex-col overflow-hidden w-full transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'md:ml-0' : 'ml-0'
        }`}>
          <header className="h-16 bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-700/20 p-4 flex items-center justify-between">
            <div className="flex items-center">
              {!sidebarOpen && (
                <button 
                  className="mr-3 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all duration-200"
                  onClick={toggleSidebar}
                  aria-label="Open sidebar"
                >
                  <Menu size={20} className="text-gray-600 dark:text-gray-300 transition-transform duration-200" />
                </button>
              )}
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
                {getRouteTitle()}
              </h1>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            {children}
          </main>
        </div>
      </div>
    );

    // Wrap with the appropriate provider based on the route
    if (pathname.includes('/dashboard/email')) {
      return <EmailProvider>{layoutContent}</EmailProvider>;
    } else if (pathname.includes('/dashboard/calendar')) {
      return <CalendarProvider>{layoutContent}</CalendarProvider>;
    }
    
    return layoutContent;
  };

  return (
    <>
      {getLayoutContent()}
      {/* Toast notifications */}
      <Toaster position="top-right" />
    </>
  );
};

export default DashboardLayout;