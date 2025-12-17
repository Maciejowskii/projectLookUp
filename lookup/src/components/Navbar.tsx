import Link from "next/link";
import { Search } from "lucide-react";

export default function Navbar({ tenantName }: { tenantName: string }) {
  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo / Nazwa */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg group-hover:bg-blue-700 transition">
            <Search size={20} />
          </div>
          <span className="font-bold text-xl text-gray-900 tracking-tight">
            {tenantName}
          </span>
        </Link>

        {/* Menu (Placeholder) */}
        <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-600">
          <Link href="/" className="hover:text-blue-600 transition">
            Szukaj firm
          </Link>
          <Link href="#" className="hover:text-blue-600 transition">
            Cennik
          </Link>
          <Link href="#" className="hover:text-blue-600 transition">
            Dla Firm
          </Link>
        </nav>

        {/* CTA Button */}
        <Link
          href="#"
          className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition"
        >
          Dodaj firmę
        </Link>
      </div>
    </header>
  );
}
