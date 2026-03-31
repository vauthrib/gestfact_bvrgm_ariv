import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login'
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth/* (NextAuth routes)
     * - api/users/init (User initialization)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login page
     * - init page (first-time setup)
     */
    '/((?!api/auth|api/users/init|_next/static|_next/image|favicon.ico|login|init).*)',
  ],
};
