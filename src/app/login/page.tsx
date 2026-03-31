import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/');
  }

  // Check if any users exist, if not redirect to init
  try {
    const userCount = await db.user.count();
    if (userCount === 0) {
      redirect('/init');
    }
  } catch (e) {
    // Table might not exist, redirect to init
    redirect('/init');
  }

  return <LoginForm />;
}
