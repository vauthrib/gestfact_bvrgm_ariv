import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import InitForm from './InitForm';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function InitPage() {
  // Check if any users exist
  const userCount = await db.user.count();
  
  if (userCount > 0) {
    redirect('/login');
  }

  return <InitForm />;
}
