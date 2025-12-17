import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  LogOut,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold tracking-wider text-blue-400">
            LookUp<span className="text-white">Admin</span>
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/admin/leads"
            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
          >
            <Users size={20} />
            <span>Leady / Zgłoszenia</span>
          </Link>

          <Link
            href="/admin/companies"
            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
          >
            <Building2 size={20} />
            <span>Firmy</span>
          </Link>

          <Link
            href="/admin/settings"
            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
          >
            <Settings size={20} />
            <span>Ustawienia</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <a
            href="/"
            className="flex items-center gap-3 px-4 py-2 text-red-400 hover:text-red-300 transition-colors text-sm"
          >
            <LogOut size={16} />
            Wróć do strony głównej
          </a>
        </div>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
