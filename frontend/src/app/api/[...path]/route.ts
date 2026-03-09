import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: any }) {
    return proxyRequest(request, params);
}

export async function POST(request: NextRequest, { params }: { params: any }) {
    return proxyRequest(request, params);
}

export async function PUT(request: NextRequest, { params }: { params: any }) {
    return proxyRequest(request, params);
}

export async function DELETE(request: NextRequest, { params }: { params: any }) {
    return proxyRequest(request, params);
}

async function proxyRequest(request: NextRequest, params: any) {
    try {
        const resolvedParams = await params;
        const pathArray = resolvedParams.path || [];
        const path = pathArray.join('/');
        const searchParams = request.nextUrl.searchParams.toString();

        // Target backend on the same STB
        const targetUrl = `http://127.0.0.1:8080/api/${path}${searchParams ? '?' + searchParams : ''}`;
        console.log(`[Proxy] ${request.method} ${request.url} -> ${targetUrl}`);

        // Clone headers and remove host to prevent backend confusion
        const headers = new Headers(request.headers);
        headers.delete('host');
        headers.delete('connection');

        const fetchOptions: RequestInit = {
            method: request.method,
            headers: headers,
            cache: 'no-store',
        };

        // For non-GET requests, forward the body
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            const body = await request.arrayBuffer();
            if (body.byteLength > 0) {
                fetchOptions.body = body;
            }
        }

        const backendResponse = await fetch(targetUrl, fetchOptions);

        // Handle backend errors or redirects
        if (!backendResponse.ok) {
            console.error(`[Proxy] Backend returned ${backendResponse.status} for ${targetUrl}`);
        }

        // Get the response body
        const responseData = await backendResponse.arrayBuffer();

        const responseHeaders = new Headers();
        const contentType = backendResponse.headers.get('Content-Type');
        if (contentType) responseHeaders.set('Content-Type', contentType);

        // Return response to client
        return new NextResponse(responseData, {
            status: backendResponse.status,
            headers: responseHeaders
        });

    } catch (error: any) {
        console.error('[Proxy] Critical Error:', error.message);
        return NextResponse.json({
            error: 'Gagal terhubung ke Backend STB',
            details: error.message
        }, { status: 500 });
    }
}
