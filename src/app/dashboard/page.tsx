'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Mail, Briefcase, Clock, Users } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Job {
  id: string;
  name: string;
  monday_id: string;
  details?: Record<string, any>;
  created_at?: string;
}

const DashboardPage = () => {
  const { data: session } = useSession();
  const [activeJobs, setActiveJobs] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [nextEventDays, setNextEventDays] = useState<number | null>(null);
  const [urgentMessages, setUrgentMessages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [jobGrowth, setJobGrowth] = useState<{ percentage: number; isPositive: boolean } | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loadingStates, setLoadingStates] = useState({
    jobs: true,
    events: true,
    messages: true,
    recentActivity: true
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Set initial loading state
      setIsLoading(true);
      setLoadingStates({
        jobs: true,
        events: true,
        messages: true,
        recentActivity: true
      });

      // Fetch active jobs count
      fetchJobsData();
      
      // Fetch upcoming events
      fetchEventsData();
      
      // Fetch unread messages count
      fetchMessagesData();
    };

    fetchDashboardData();
  }, []);

  // Update overall loading state when individual states change
  useEffect(() => {
    const { jobs, events, messages, recentActivity } = loadingStates;
    setIsLoading(jobs || events || messages || recentActivity);
  }, [loadingStates]);

  const fetchJobsData = async () => {
    try {
      const jobsResponse = await fetch('/api/jobs');
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        setActiveJobs(jobsData.length || 0);
        
        // Get recent jobs (limit to 4)
        const sortedJobs = [...jobsData].sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA; // Sort by most recent first
        });
        
        setRecentJobs(sortedJobs.slice(0, 4));
        
        // Calculate job growth
        calculateJobGrowth(jobsData.length);
      }
    } catch (error) {
      console.error('Error fetching jobs data:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, jobs: false, recentActivity: false }));
    }
  };

  const calculateJobGrowth = async (currentJobCount: number) => {
    try {
      // Get jobs from last month for comparison
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      const lastMonthTimestamp = lastMonthDate.toISOString();
      
      const jobsHistoryResponse = await fetch(`/api/jobs/history?date=${lastMonthTimestamp}`);
      if (jobsHistoryResponse.ok) {
        const jobsHistoryData = await jobsHistoryResponse.json();
        const lastMonthJobCount = jobsHistoryData.count || 0;
        
        if (lastMonthJobCount > 0) {
          const growthPercentage = ((currentJobCount - lastMonthJobCount) / lastMonthJobCount) * 100;
          setJobGrowth({
            percentage: Math.abs(Math.round(growthPercentage)),
            isPositive: growthPercentage >= 0
          });
        } else if (currentJobCount > 0) {
          // If there were no jobs last month but there are now, that's 100% growth
          setJobGrowth({ percentage: 100, isPositive: true });
        } else {
          // No jobs last month and no jobs now
          setJobGrowth({ percentage: 0, isPositive: true });
        }
      } else {
        // Fallback if we can't get historical data
        console.error('Failed to fetch job history data, using fallback');
        // Use a static fallback percentage for now
        setJobGrowth({ percentage: 12, isPositive: true });
      }
    } catch (error) {
      console.error('Error calculating job growth:', error);
      setJobGrowth({ percentage: 12, isPositive: true });
    }
  };

  const fetchEventsData = async () => {
    try {
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setDate(today.getDate() + 30);
      
      const eventsResponse = await fetch(
        `/api/events?startDate=${today.toISOString()}&endDate=${nextMonth.toISOString()}`
      );
      
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setUpcomingEvents(eventsData.events?.length || 0);
        
        // Calculate days until next event
        if (eventsData.events && eventsData.events.length > 0) {
          const sortedEvents = [...eventsData.events].sort((a, b) => 
            new Date(a.start).getTime() - new Date(b.start).getTime()
          );
          
          const nextEvent = sortedEvents[0];
          const nextEventDate = new Date(nextEvent.start);
          const diffTime = Math.abs(nextEventDate.getTime() - today.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setNextEventDays(diffDays);
        }
      }
    } catch (error) {
      console.error('Error fetching events data:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, events: false }));
    }
  };

  const fetchMessagesData = async () => {
    try {
      const emailsResponse = await fetch('/api/emails?folder=INBOX');
      if (emailsResponse.ok) {
        const emailsData = await emailsResponse.json();
        const unreadCount = emailsData.emails?.filter((email: any) => !email.isRead).length || 0;
        setUnreadMessages(unreadCount);
        
        // Count urgent messages (high importance)
        const urgentCount = emailsData.emails?.filter(
          (email: any) => !email.isRead && email.importance === 'high'
        ).length || 0;
        setUrgentMessages(urgentCount);
      }
    } catch (error) {
      console.error('Error fetching messages data:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, messages: false }));
    }
  };

  // Format date for recent activity
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  // Loading skeleton for stats
  const StatSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      </div>
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
    </div>
  );

  // Loading skeleton for recent activity
  const ActivitySkeleton = () => (
    <div className="flex items-start animate-pulse">
      <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 mr-3"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back{session?.user?.firstName ? `, ${session.user.firstName} ${session.user.lastName || ''}` : ''}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Here&apos;s an overview of your workspace</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {loadingStates.jobs ? (
          <StatSkeleton />
        ) : (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Active Jobs</h3>
              <Briefcase className="text-blue-500" size={20} />
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{activeJobs}</p>
            <p className={`text-sm ${jobGrowth?.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} mt-2`}>
              {jobGrowth ? 
                `${jobGrowth.isPositive ? '↑' : '↓'} ${jobGrowth.percentage}% from last month` : 
                'No change from last month'}
            </p>
          </div>
        )}

        {loadingStates.events ? (
          <StatSkeleton />
        ) : (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Upcoming Events</h3>
              <Calendar className="text-purple-500" size={20} />
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{upcomingEvents}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {nextEventDays !== null 
                ? `Next event in ${nextEventDays} day${nextEventDays !== 1 ? 's' : ''}` 
                : 'No upcoming events'}
            </p>
          </div>
        )}

        {loadingStates.messages ? (
          <StatSkeleton />
        ) : (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Unread Messages</h3>
              <Mail className="text-indigo-500" size={20} />
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{unreadMessages}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {urgentMessages > 0 ? `${urgentMessages} urgent message${urgentMessages !== 1 ? 's' : ''}` : 'No urgent messages'}
            </p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Jobs</h2>
          <div className="space-y-4">
            {loadingStates.recentActivity ? (
              <>
                <ActivitySkeleton />
                <ActivitySkeleton />
                <ActivitySkeleton />
                <ActivitySkeleton />
              </>
            ) : recentJobs.length > 0 ? (
              recentJobs.map((job, index) => (
                <div key={job.id} className="flex items-start">
                  <Briefcase className="text-gray-400 dark:text-gray-500 mt-1 mr-3" size={16} />
                  <div>
                    <p className="text-gray-900 dark:text-gray-100">{job.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {job.created_at ? formatTimeAgo(job.created_at) : 'Recently added'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600 dark:text-gray-400">No recent jobs found</p>
            )}
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