import { NextRequest, NextResponse } from "next/server";

const ADMIN_TOKEN = process.env.MATCH_ADMIN_TOKEN || "dev-admin-token";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Only guard /admin routes (not /admin/login itself)
    if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
        const cookie = req.cookies.get("admin_token")?.value;
        if (cookie !== ADMIN_TOKEN) {
            const loginUrl = new URL("/admin/login", req.url);
            loginUrl.searchParams.set("redirect", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*"],
};
