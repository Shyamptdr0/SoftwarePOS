import { NextResponse } from 'next/server';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Public paths that don't require authentication
  const publicPaths = ['/auth/login', '/', '/api/auth'];
  
  // Check if the path is public
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // Protected paths that require authentication
  const protectedPaths = ['/dashboard', '/pos', '/products', '/inventory', '/reports'];
  
  // Check if trying to access protected path
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    // For now, allow access - in production, check authentication
    // const token = request.cookies.get('token')?.value;
    // if (!token) {
    //   return NextResponse.redirect(new URL('/auth/login', request.url));
    // }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
