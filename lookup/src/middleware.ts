import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/admin/:path*"],
};

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get("authorization");
  const url = req.nextUrl;

  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (url.pathname.startsWith("/admin")) {
    if (basicAuth) {
      const authValue = basicAuth.split(" ")[1];
      const [user, pwd] = atob(authValue).split(":");

      if (user === adminUser && pwd === adminPass) {
        // SUKCES: Puszczamy dalej, ale dodajemy header/cookie
        const response = NextResponse.next();
        // Ustawiamy ciasteczko sesji admina (ważne 1h)
        // Dzięki temu Server Action będzie mógł sprawdzić, czy user przeszedł przez ten auth
        response.cookies.set("is_admin_authenticated", "true", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 3600, // 1 godzina
        });
        return response;
      }
    }

    return new NextResponse("Auth Required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Secure Area"',
      },
    });
  }

  return NextResponse.next();
}
