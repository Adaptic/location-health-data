import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  // If you have a custom domain add it below to the
  // space separated frame-ancestors list.
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://vercel.live/ https://vercel.com 'unsafe-inline';
    connect-src https://vercel.live/ https://vercel.com *.pusher.com *.pusherapp.com;
    style-src 'self' 'nonce-${nonce}';
    img-src https://vercel.live/ https://vercel.com *.pusher.com/ data: blob 'self' blob: data:;
    frame-src https://vercel.live/ https://vercel.com;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors https://dashboard.copilot.com/ https://*.copilot.app/;
    block-all-mixed-content;
    upgrade-insecure-requests;
`;
  // Replace newline characters and spaces
  const contentSecurityPolicyHeaderValue = cspHeader
    .replace(/\s{2,}/g, ' ')
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  requestHeaders.set(
    'Content-Security-Policy',
    contentSecurityPolicyHeaderValue,
  );

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set(
    'Content-Security-Policy',
    contentSecurityPolicyHeaderValue,
  );

  return response;
}
