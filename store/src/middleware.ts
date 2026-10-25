import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { hasSupabase } from "@/lib/supabase/env";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Guards /admin/*. A visitor needs a valid Supabase session AND a row in public.admins.
 * (Every admin page and server action re-checks this, and Row Level Security is the final barrier.)
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

  const isLogin = request.nextUrl.pathname === "/admin/login";
  let isAdmin = false;
  if (user) {
    const { data } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    isAdmin = !!data;
  }

  if (!isAdmin && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = user ? "?error=unauthorized" : "";
    return NextResponse.redirect(url);
  }
  if (isAdmin && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
