import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)"],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Pobieramy hosta, a jeśli jest null, używamy pustego stringa (bezpiecznik)
  const hostHeader = req.headers.get("host") || "";

  // Usuwamy port z hosta (np. :3000) dla czystości
  const hostname = hostHeader.replace(":3000", "");

  console.log("Middleware -> Host:", hostname, "Path:", url.pathname);

  // Lista domen, które traktujemy jako "główne" (bez subdomen)
  const mainDomains = ["localhost", "twojadomena.pl", "www.twojadomena.pl"];

  // Jeśli to domena główna lub pusta -> puszczamy standardowo
  if (mainDomains.includes(hostname) || !hostname) {
    return NextResponse.next();
  }

  // --- LOGIKA SUBDOMEN ---
  // Wyciągamy pierwszy człon (np. "mechanicy" z "mechanicy.localhost")
  const subdomain = hostname.split(".")[0];

  // Budujemy nową ścieżkę wewnętrzną
  const searchParams = url.searchParams.toString();
  const path = `${url.pathname}${
    searchParams.length > 0 ? `?${searchParams}` : ""
  }`;

  // Przepisujemy URL na strukturę folderów: src/app/[domain]/...
  // Np. mechanicy.localhost:3000/ -> wewnątrz staje się -> /mechanicy/
  return NextResponse.rewrite(new URL(`/${subdomain}${path}`, req.url));
}
