import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// W layout też musimy pobrać dane tenanta, żeby przekazać nazwę do Navbara
export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { subdomain: domain },
  });

  if (!tenant) return notFound();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
      <Navbar tenantName={tenant.name} />
      <main className="flex-grow">{children}</main>
      <Footer tenantName={tenant.name} />
    </div>
  );
}
