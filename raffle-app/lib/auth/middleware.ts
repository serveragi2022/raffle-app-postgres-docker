import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login"];

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p)) || path.startsWith("/api/auth");

  if (!session && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  if (session) {
    const role = session.role ?? "viewer";
    if (path === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = role === "admin" ? "/dashboard" : "/raffle";
      return NextResponse.redirect(url);
    }

    if (path.startsWith("/api/")) {
      return response;
    }

    if (role === "viewer") {
      const allowedViewerPages = ["/login", "/raffle", "/winners"];
      if (!allowedViewerPages.some((allowed) => path === allowed || path.startsWith(`${allowed}/`))) {
        const url = request.nextUrl.clone();
        url.pathname = "/raffle";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}
