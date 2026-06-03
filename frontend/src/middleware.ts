import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_FILE_REGEX = /\.(.*)$/;
const SUPPORTED_LOCALES = ['en', 'ar'];
const DEFAULT_LOCALE = 'en';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip system/public paths
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    PUBLIC_FILE_REGEX.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. Detect locale prefix
  const pathParts = pathname.split('/');
  const localePrefix = pathParts[1];
  const hasLocalePrefix = SUPPORTED_LOCALES.includes(localePrefix);

  if (!hasLocalePrefix) {
    // Redirect to default or cookie locale
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    const acceptLang = request.headers.get('accept-language') || '';
    const headerLocale = acceptLang.startsWith('ar') ? 'ar' : 'en';
    const locale = cookieLocale || headerLocale || DEFAULT_LOCALE;

    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url);
  }

  // 3. Extract the actual target path (without locale prefix)
  const targetPath = pathname.replace(`/${localePrefix}`, '') || '/';

  // 4. Protect /admin routes (e.g. /en/admin, /ar/admin)
  if (targetPath.startsWith('/admin')) {
    const tokenCookie = request.cookies.get('accessToken') || request.cookies.get('__Host-accessToken');
    const token = tokenCookie?.value;

    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = `/${localePrefix}/auth/login`;
      return NextResponse.redirect(url);
    }

    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) throw new Error('Invalid JWT format');

      const payloadDecoded = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadDecoded);
      
      const adminRoles = ['admin', 'super_admin', 'inventory_manager', 'support_agent'];
      if (!payload.role || !adminRoles.includes(payload.role)) {
        const url = request.nextUrl.clone();
        url.pathname = `/${localePrefix}`;
        return NextResponse.redirect(url);
      }
    } catch (error) {
      const url = request.nextUrl.clone();
      url.pathname = `/${localePrefix}/auth/login`;
      return NextResponse.redirect(url);
    }
  }

  // 5. Rewrite internally to target route and persist locale in cookie
  const host = request.headers.get('host') || '';
  let tenantSlug: string | null = null;
  const cleanHost = host.split(':')[0];
  const parts = cleanHost.split('.');

  if (parts.length > 1) {
    if (cleanHost.endsWith('localhost') || cleanHost.endsWith('apexluxe.com')) {
      const sub = parts[0];
      if (sub !== 'www' && sub !== 'platform') {
        tenantSlug = sub;
      }
    } else {
      tenantSlug = cleanHost;
    }
  }

  const requestHeaders = new Headers(request.headers);
  if (tenantSlug) {
    requestHeaders.set('x-tenant-id', tenantSlug);
  }
  requestHeaders.set('x-locale', localePrefix);

  const response = NextResponse.rewrite(new URL(targetPath, request.url), {
    request: {
      headers: requestHeaders,
    },
  });

  response.cookies.set('NEXT_LOCALE', localePrefix, { path: '/' });
  if (tenantSlug) {
    response.cookies.set('x-tenant-slug', tenantSlug, { path: '/' });
  } else {
    response.cookies.delete('x-tenant-slug');
  }
  return response;
}

export const config = {
  // Match all paths except api and assets
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
