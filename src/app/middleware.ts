import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request: { headers: request.headers },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookies) {
                    cookies.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
                },
            },
        }
    );

    // Refresh session if expired
    const { data: { session } } = await supabase.auth.getSession();

    // Protected routes - redirect to login if not authenticated
    const protectedPaths = ['/play'];
    if (protectedPaths.some(path => request.nextUrl.pathname.startsWith(path)) && !session) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Auth routes - redirect to home if already authenticated
    const authPaths = ['/auth/login', '/auth/signup'];
    if (authPaths.includes(request.nextUrl.pathname) && session) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};