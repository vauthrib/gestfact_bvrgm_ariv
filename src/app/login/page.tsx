import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

// Simple page - no server-side database check
export default function LoginPage() {
  return <LoginForm />;
}
