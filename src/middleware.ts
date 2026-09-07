import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/projects", "/settings"];
const AUTH_ROUTES = ["/login", "/signup"];
const CANONICAL_HOST = "www.paymeify.com";
const ALIAS_HOSTS = new Set(["paymeify.com", "paymeify.vercel.app"]);

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  if (ALIAS_HOSTS.has(host)) {
    const url = request.nextUrl.clone();
    url.hostname = CANONICAL_HOST;
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  let response = NextResponse.next({ request });

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim();

  // Without credentials there is no session to refresh; let the page render and
  // surface a configuration error of its own.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refresh/read the session from cookies. getSession is local JWT work and is
  // far cheaper than getUser (Auth API). Pages/actions still call getUser via
  // requireSession() before reading or writing user data.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const { pathname, search } = request.nextUrl;

  // A Server Action POST carries a `next-action` id that only exists on the
  // page that rendered the form. Redirecting that POST to /login (or anywhere
  // else) makes Next look the id up on the wrong page and throw
  // UnrecognizedActionError. The actions already call requireSession().
  const isServerAction =
    request.method === "POST" && Boolean(request.headers.get("next-action"));

  if (isServerAction) return response;

  if (!user && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(redirect);
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/dashboard";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and API routes. API routes authenticate
     * themselves — the webhook by signature, the public pay route by token.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
