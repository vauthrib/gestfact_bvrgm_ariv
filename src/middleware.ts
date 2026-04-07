import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Vérification des horaires d'accès (timezone Casablanca)
function isAccessAllowed(role: string | undefined): { allowed: boolean; reason?: string } {
  // Les administrateurs n'ont pas de restriction horaire
  if (role === 'ADMIN') {
    return { allowed: true };
  }

  // Obtenir l'heure actuelle en timezone Casablanca
  const now = new Date();
  const casablancaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }));
  
  const dayOfWeek = casablancaTime.getDay(); // 0 = dimanche, 1 = lundi, ..., 6 = samedi
  const hours = casablancaTime.getHours();
  const minutes = casablancaTime.getMinutes();
  const currentTimeInMinutes = hours * 60 + minutes;

  // Jours autorisés: lundi (1) à vendredi (5)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { allowed: false, reason: 'weekend' };
  }

  // Heures autorisées: 7:30 (450 min) à 18:00 (1080 min)
  const startMinutes = 7 * 60 + 30; // 450
  const endMinutes = 18 * 60; // 1080

  if (currentTimeInMinutes < startMinutes || currentTimeInMinutes >= endMinutes) {
    return { allowed: false, reason: 'time' };
  }

  return { allowed: true };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/init', '/api/auth', '/api/users/init', '/api/users/create-root', '/api/setup', '/access-denied'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for session
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  if (!token) {
    // Use origin or fallback to prevent invalid URL errors
    const baseUrl = request.nextUrl.origin || 'https://gestfact-bvrgm-ariv.vercel.app';
    const loginUrl = new URL('/login', baseUrl);
    return NextResponse.redirect(loginUrl);
  }

  // Vérification des horaires d'accès
  const accessCheck = isAccessAllowed(token.role as string);
  if (!accessCheck.allowed) {
    const baseUrl = request.nextUrl.origin || 'https://gestfact-bvrgm-ariv.vercel.app';
    const deniedUrl = new URL('/access-denied', baseUrl);
    return NextResponse.redirect(deniedUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
