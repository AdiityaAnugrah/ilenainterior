import { NextResponse, type NextRequest } from 'next/server';

async function forwardToApi(request: NextRequest, apiPath: string) {
  const url = new URL(request.url);
  url.pathname = apiPath;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const apiResponse = await fetch(url, init);

  const responseHeaders = new Headers(apiResponse.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');

  return new NextResponse(apiResponse.body, {
    status: apiResponse.status,
    statusText: apiResponse.statusText,
    headers: responseHeaders,
  });
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === '/products') {
    return forwardToApi(request, '/api/products');
  }

  if (
    pathname === '/projects' &&
    request.method !== 'GET' &&
    request.method !== 'HEAD'
  ) {
    return forwardToApi(request, '/api/projects');
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/products', '/projects'],
};
