import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  const authCookie = request.cookies.get('pdk_auth');
  const isAuthenticated = authCookie?.value === 'authenticated';

  // If not authenticated and not on login page, redirect to login
  if (!isAuthenticated && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If authenticated and on login page, redirect to home
  if (isAuthenticated && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
