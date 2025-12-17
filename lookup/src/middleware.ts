import { NextRequest, NextResponse } from "next/server";

export const config = {
  // Matcher łapie wszystko OPRÓCZ plików statycznych, api, _next
  matcher: ["/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)"],
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  // --- 1. OCHRONA PANELU ADMINA (Basic Auth) ---
  // Jeśli ścieżka zaczyna się od /admin, wymuszamy logowanie
  if (pathname.startsWith("/admin")) {
    const basicAuth = req.headers.get("authorization");

    if (basicAuth) {
      const authValue = basicAuth.split(" ")[1];
      const [user, pwd] = atob(authValue).split(":");

      const validUser = process.env.ADMIN_USER || "admin";
      const validPass = process.env.ADMIN_PASSWORD || "admin";

      if (user === validUser && pwd === validPass) {
        return NextResponse.next();
      }
    }

    return new NextResponse("Dostęp zabroniony. Wymagane logowanie.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Secure Admin Area"',
      },
    });
  }

  // --- 2. OBSŁUGA SUBDOMEN (Multi-Tenancy) ---
  const hostHeader = req.headers.get("host") || "";
  // Usuwamy port i "www."
  const hostname = hostHeader.replace(":3000", "").replace("www.", "");

  // Domeny główne, które NIE są subdomenami tenantów
  // Dodaj tu swoją domenę produkcyjną, np. "projectlookup.com"
  const mainDomains = ["localhost", "projectlookup.com", "lookup.pl"];

  // Jeśli to domena główna -> puszczamy ruch normalnie (np. na Landing Page)
  if (mainDomains.includes(hostname) || !hostname) {
    return NextResponse.next();
  }

  // Jeśli to subdomena (np. "mechanicy.localhost" lub "mechanicy.projectlookup.com")
  // Wyciągamy subdomenę
  const subdomain = hostname.split(".")[0];

  // Przepisujemy URL wewnętrznie na strukturę: /app/[domain]/...
  // Np. mechanicy.localhost/kontakt -> /mechanicy/kontakt
  return NextResponse.rewrite(
    new URL(`/${subdomain}${pathname}${url.search}`, req.url)
  );
}
