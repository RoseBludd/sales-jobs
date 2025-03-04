'use client';

import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

// Import sidebar contents
import CalendarSidebarContent from './calendar/sidebar';
import EmailSidebarContent from './email/sidebar';
import JobsSidebarContent from './jobs/sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // For email sidebar
  const [currentFolder, setCurrentFolder] = useState('inbox');
  const mockEmails = [
    { id: 1, folder: 'inbox', isRead: true },
    { id: 2, folder: 'inbox', isRead: false },
    { id: 3, folder: 'inbox', isRead: true }
  ];

  // For calendar sidebar
  const mockEvents = [
    { id: 1, title: 'Team Meeting', start: new Date(2025, 2, 15, 10, 0), end: new Date(2025, 2, 15, 11, 0), description: 'Weekly team sync' },
    { id: 2, title: 'Client Call', start: new Date(2025, 2, 16, 14, 0), end: new Date(2025, 2, 16, 15, 0), description: 'Project status update' },
    { id: 3, title: 'Deployment Review', start: new Date(2025, 2, 18, 13, 0), end: new Date(2025, 2, 18, 14, 30), description: 'Reviewing latest deployment' }
  ];

  // Get current route title
  const getRouteTitle = () => {
    switch (true) {
      case pathname === '/dashboard':
        return 'Dashboard';
      case pathname.includes('/dashboard/jobs'):
        return 'Jobs';
      case pathname.includes('/dashboard/email'):
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
        return (
          <EmailSidebarContent 
            currentFolder={currentFolder}
            emails={mockEmails}
            onFolderSelect={setCurrentFolder}
          />
        );
      case pathname.includes('/dashboard/jobs'):
        return <JobsSidebarContent />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        toggleSidebar={toggleSidebar}
        currentPath={pathname}
      >
        {renderSidebarContent()}
      </Sidebar>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-700/20 p-4 flex items-center justify-between">
          <div className="flex items-center">
            {!sidebarOpen && (
              <button 
                className="mr-3 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                onClick={toggleSidebar}
              >
                <Menu size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
            )}
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
              {getRouteTitle()}
            </h1>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {pathname === '/dashboard/change-password' && (
              <button 
                onClick={() => window.history.back()}
                className="hover:text-gray-900 dark:hover:text-white"
              >
                Back
              </button>
            )}
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;