import InitForm from './InitForm';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Simple page that just renders the form
// Table creation will happen via /api/users/init when the form is submitted
export default async function InitPage() {
  return <InitForm />;
}
