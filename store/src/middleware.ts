import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { hasSupabase } from "@/lib/supabase/env";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Guards /admin/*: keeps the Supabase session fresh and sends visitors without one to the login page.
 * Admin rights (a row in public.admins) are checked by every admin page and server action.
 */
export async function middleware(request: NextRequest) {
  // Preview without a database: there is no admin to protect yet, so keep it closed.
  if (!hasSupabase) return new NextResponse("The admin opens once the database is connected.", { status: 503 });
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(list: { name: string; value: string; options: CookieOptions }[]) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only the session is checked here: this runs far from the database, and every admin page and
  // server action checks the admins table itself (requireAdmin), with Row Level Security behind it.
  if (!user && request.nextUrl.pathname !== "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
