import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
              src="/restoremasters_logo.jpg"
              alt="Restore Masters Logo"
              width={150}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          {showSignOut && (
            <button
              onClick={handleSignOut}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
