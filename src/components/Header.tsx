import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface HeaderProps {
  showSignOut?: boolean;
}

export default function Header({ showSignOut = false }: HeaderProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Image
              src="/restoremasters_logo.png"
              alt="Restore Masters Logo"
              width={150}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          {showSignOut && (
            <div className="flex items-center space-x-4">
<Link
  href="/fillout"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50
            shadow-sm transition-all duration-200 hover:shadow
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
>
                <svg
                  className="mr-2 h-5 w-5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                Add New Job
              </Link>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600
                          hover:bg-blue-700 transition-all duration-200
                          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
