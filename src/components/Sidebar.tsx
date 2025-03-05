'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Mail, Settings, User, LogOut, Home, ChevronLeft, Briefcase, Sun, Moon } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import toast from 'react-hot-toast';

type NavItem = {
  href: string;
  icon: typeof Home;
  label: string;
};

interface SidebarProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  currentPath: string;
  children?: React.ReactNode;
}

const useTheme = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    setIsDark(savedTheme === 'dark');
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = !isDark ? 'dark' : 'light';
    setIsDark(!isDark);
    document.documentElement.classList[newTheme === 'dark' ? 'add' : 'remove']('dark');
    localStorage.setItem('theme', newTheme);
  }, [isDark]);

  return { isDark, toggleTheme };
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/dashboard/jobs', icon: Briefcase, label: 'Jobs' },
  { href: '/dashboard/email/inbox', icon: Mail, label: 'Email' },
  { href: '/dashboard/calendar', icon: Calendar, label: 'Calendar' },
];

const NavLink = ({ href, icon: Icon, label, isActive }: NavItem & { isActive: boolean }) => (
  <li>
    <Link
      href={href}
      className={`flex items-center p-2 mb-1 rounded-md transition-colors
        ${isActive ? 'bg-gray-700' : 'hover:bg-gray-700/80'}`}
    >
      <Icon size={18} className="mr-2" />
      <span>{label}</span>
    </Link>
  </li>
);

const Sidebar = ({ sidebarOpen, toggleSidebar, currentPath, children }: SidebarProps) => {
  const { data: session } = useSession();
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: true, callbackUrl: '/login' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      toast.error(`Error signing out: ${errorMessage}`);
    }
  };

  const handleSettingsClick = () => router.push('/dashboard/change-password');
  const isSettingsActive = currentPath === '/dashboard/change-password';

  if (!sidebarOpen) {
    return (
      <div className="w-0 -ml-1 transition-all duration-300 overflow-hidden" />
    );
  }

  return (
    <aside className="w-64 transition-all duration-300 bg-gray-800 text-white h-full flex flex-col">
      <header className="h-16 p-4 shadow-sm dark:shadow-gray-700/20 border-b border-gray-700 flex justify-between items-center">
        <Image
          src="/restoremasters_logo.png"
          alt="Restore Masters"
          width={150}
          height={40}
          className="object-contain"
          priority
        />
        <button 
          className="p-1 hover:bg-gray-700 rounded-md transition-colors"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <ChevronLeft size={20} />
        </button>
      </header>
      
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          <p className="text-gray-400 text-sm mb-2 uppercase tracking-wider">Apps</p>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                isActive={currentPath === item.href}
              />
            ))}
          </ul>
        </div>
        <div className="overflow-y-auto">
          {children}
        </div>
      </nav>
      
      <footer className="p-4 border-t border-gray-700">
        <div className="flex items-center mb-4">
          <User size={18} className="mr-2 text-gray-400" />
          <span className="text-sm text-gray-300">{session?.user?.email || 'User'}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button 
              onClick={handleSettingsClick}
              className={`p-2 rounded-md transition-colors
                ${isSettingsActive ? 'bg-gray-700' : 'hover:bg-gray-700/80'}`}
              title="Settings"
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-gray-700/80 rounded-md transition-colors"
              title={isDark ? "Light mode" : "Dark mode"}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
          <button 
            onClick={handleSignOut}
            className="p-2 hover:bg-gray-700/80 rounded-md transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </footer>
    </aside>
  );
};

export default Sidebar;