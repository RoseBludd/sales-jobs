'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Mail, Briefcase, Clock, Users } from 'lucide-react';

const DashboardPage = () => {
  return (
    <div className="p-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Here&apos;s an overview of your workspace</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Active Jobs</h3>
            <Briefcase className="text-blue-500" size={20} />
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">24</p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-2">↑ 12% from last month</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Upcoming Events</h3>
            <Calendar className="text-purple-500" size={20} />
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">3</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Next event in 2 days</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Unread Messages</h3>
            <Mail className="text-indigo-500" size={20} />
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">5</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">2 urgent messages</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Team Members</h3>
            <Users className="text-green-500" size={20} />
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">12</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">4 currently active</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { time: '2 hours ago', text: 'New job added: Roof Repair - 123 Main St' },
              { time: '3 hours ago', text: 'Calendar event updated: Client Meeting' },
              { time: '5 hours ago', text: 'Email sent to John regarding project update' },
              { time: 'Yesterday', text: 'Completed job review for 456 Oak Ave' },
            ].map((activity, index) => (
              <div key={index} className="flex items-start">
                <Clock className="text-gray-400 dark:text-gray-500 mt-1 mr-3" size={16} />
                <div>
                  <p className="text-gray-900 dark:text-gray-100">{activity.text}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/dashboard/jobs"
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:shadow-gray-700/25 transition-shadow group"
        >
          <Briefcase className="text-blue-500 mb-4 group-hover:scale-110 transition-transform" size={24} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Manage Jobs</h3>
          <p className="text-gray-600 dark:text-gray-400">Access and track all your current jobs</p>
        </Link>

        <Link
          href="/dashboard/calendar"
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:shadow-gray-700/25 transition-shadow group"
        >
          <Calendar className="text-purple-500 mb-4 group-hover:scale-110 transition-transform" size={24} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Calendar</h3>
          <p className="text-gray-600 dark:text-gray-400">View and manage your schedule</p>
        </Link>

        <Link
          href="/dashboard/email"
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:shadow-gray-700/25 transition-shadow group"
        >
          <Mail className="text-indigo-500 mb-4 group-hover:scale-110 transition-transform" size={24} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Messages</h3>
          <p className="text-gray-600 dark:text-gray-400">Check your inbox and communications</p>
        </Link>
      </div>
    </div>
  );
};

export default DashboardPage;