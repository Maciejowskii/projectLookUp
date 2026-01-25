export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNavigation } from "@/components/BottomNavigation";

// W layout też musimy pobrać dane tenanta, żeby przekazać nazwę do Navbara
export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  let tenant
  try {
    tenant = await prisma.tenant.findUnique({
      where: { subdomain: domain },
    })
  } catch (error) {
    // Podczas build time baza może być niedostępna
    console.warn('[TENANT LAYOUT] Could not fetch tenant, using notFound:', error)
    return notFound()
  }

  if (!tenant) return notFound();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
      <Navbar />
      <main className="flex-grow pb-20 md:pb-0">{children}</main>
      <Footer />
      <BottomNavigation />
    </div>
  );
}
