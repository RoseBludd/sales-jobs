'use client';

import React from 'react';
import { toast } from 'react-hot-toast';
import { Clock, AlertCircle, X } from 'lucide-react';

type NotificationType = 'coming-soon' | 'under-maintenance' | 'beta';

interface FeatureNotificationProps {
  featureName: string;
  type?: NotificationType;
  description?: string;
  duration?: number;
}

/**
 * A utility function to display notifications for features that are not yet implemented
 * or are under development.
 */
export const showFeatureNotification = (props: FeatureNotificationProps) => {
  const { 
    featureName, 
    type = 'coming-soon', 
    description, 
    duration = 3000 
  } = props;
  
  const defaultMessages = {
    'coming-soon': `${featureName} feature is coming soon!`,
    'under-maintenance': `${featureName} is currently under maintenance.`,
    'beta': `${featureName} is in beta. Some features may not work as expected.`,
  };

  const message = description || defaultMessages[type];
  
  let icon;
  let bgColor;
  let textColor;
  
  switch (type) {
    case 'coming-soon':
      icon = <Clock className="h-5 w-5 text-blue-500" />;
      bgColor = 'bg-blue-50 dark:bg-blue-900/20';
      textColor = 'text-blue-600 dark:text-blue-300';
      break;
    case 'under-maintenance':
      icon = <AlertCircle className="h-5 w-5 text-amber-500" />;
      bgColor = 'bg-amber-50 dark:bg-amber-900/20';
      textColor = 'text-amber-600 dark:text-amber-300';
      break;
    case 'beta':
      icon = <AlertCircle className="h-5 w-5 text-purple-500" />;
      bgColor = 'bg-purple-50 dark:bg-purple-900/20';
      textColor = 'text-purple-600 dark:text-purple-300';
      break;
  }

  return toast.custom(
    (t) => (
      <div 
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full ${bgColor} shadow-lg rounded-lg pointer-events-auto flex p-4 ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 flex">
          <div className="flex-shrink-0">
            {icon}
          </div>
          <div className="ml-3 flex-1">
            <div className={`font-medium ${textColor}`}>
              {type === 'coming-soon' ? 'Coming Soon' : type === 'under-maintenance' ? 'Under Maintenance' : 'Beta Feature'}
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {message}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 flex">
          <button
            onClick={() => toast.dismiss(t.id)}
            className={`rounded-md inline-flex ${textColor} hover:text-gray-600`}
          >
            <span className="sr-only">Close</span>
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    ),
    { duration }
  );
};

/**
 * UI component wrapper for feature notifications
 */
const FeatureNotification: React.FC<{ 
  children: React.ReactNode; 
  feature: FeatureNotificationProps
}> = ({ children, feature }) => {
  return (
    <span 
      onClick={() => showFeatureNotification(feature)}
      className="cursor-pointer"
    >
      {children}
    </span>
  );
};

export default FeatureNotification; 