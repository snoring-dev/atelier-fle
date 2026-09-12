import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { consumePrintToken } from "@/lib/auth/print-token";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/login")) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token && (await verifySessionToken(token))) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const impressionMatch = pathname.match(/^\/impression\/(\d+)\/?$/);
  if (impressionMatch) {
    const ficheId = Number(impressionMatch[1]);
    const printToken = request.nextUrl.searchParams.get("t");
    if (
      printToken &&
      Number.isFinite(ficheId) &&
      (await consumePrintToken(printToken, ficheId))
    ) {
      return NextResponse.next();
    }
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken && (await verifySessionToken(sessionToken))) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and fonts (Gotenberg needs fonts).
     */
    "/((?!_next/static|_next/image|favicon.ico|fonts/).*)",
  ],
};
