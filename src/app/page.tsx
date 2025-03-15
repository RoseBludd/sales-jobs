import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export default async function Home() {
  // Check if user is authenticated
  const session = await getServerSession(authOptions);
  
  // Redirect to dashboard if authenticated, otherwise to login
  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
