import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  MessageSquare,
  Layers,
  Terminal,
  Settings,
} from "lucide-react";
import { PenTool } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-gray-200 flex-shrink-0 hidden md:flex flex-col">
        <div className="p-8">
          <h2 className="text-2xl font-black tracking-tight text-gray-900">
            ADMIN<span className="text-blue-600">PANEL</span>.
          </h2>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            Zarządzanie portalem v1.0
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {/* SEKCJA: OGÓLNE */}
          <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-4">
            Ogólne
          </p>
          <Link
            href="/admin"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all text-gray-600 hover:text-blue-600 font-medium group"
          >
            <LayoutDashboard
              size={20}
              className="group-hover:scale-110 transition-transform"
            />
            Dashboard
          </Link>
          <Link
            href="/admin/reviews"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all text-gray-600 hover:text-blue-600 font-medium group"
          >
            <MessageSquare
              size={20}
              className="group-hover:scale-110 transition-transform"
            />
            Opinie
          </Link>

          {/* SEKCJA: BAZA DANYCH */}
          <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-8">
            Baza Danych
          </p>
          <Link
            href="/admin/companies"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all text-gray-600 hover:text-blue-600 font-medium group"
          >
            <Building2
              size={20}
              className="group-hover:scale-110 transition-transform"
            />
            Firmy
          </Link>
          <Link
            href="/admin/categories"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all text-gray-600 hover:text-blue-600 font-medium group"
          >
            <Layers
              size={20}
              className="group-hover:scale-110 transition-transform"
            />
            Kategorie
          </Link>

          {/* SEKCJA: MONETYZACJA */}
          <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-8">
            Monetyzacja
          </p>
          <Link
            href="/admin/zgloszenia"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all text-gray-600 hover:text-blue-600 font-medium group"
          >
            <div className="relative">
              <ShieldCheck
                size={20}
                className="group-hover:scale-110 transition-transform"
              />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            </div>
            Przejęcia (Claims)
          </Link>
          <Link
            href="/admin/leads"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all text-gray-600 hover:text-blue-600 font-medium group"
          >
            <Users
              size={20}
              className="group-hover:scale-110 transition-transform"
            />
            Leady Użytkowników
          </Link>
          <Link
            href="/admin/blog"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all text-gray-600 hover:text-blue-600 font-medium group"
          >
            <PenTool
              size={20}
              className="group-hover:scale-110 transition-transform"
            />
            Blog & AI
          </Link>

          {/* SEKCJA: SYSTEM */}
          <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-8">
            System
          </p>
          <Link
            href="/admin/logs"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all text-gray-600 hover:text-blue-600 font-medium group"
          >
            <Terminal
              size={20}
              className="group-hover:scale-110 transition-transform"
            />
            Logi Scrapera
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all text-gray-600 hover:text-blue-600 font-medium group"
          >
            <Settings
              size={20}
              className="group-hover:scale-110 transition-transform"
            />
            Ustawienia
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button className="w-full flex items-center justify-center gap-2 text-sm font-bold text-red-500 hover:bg-red-50 py-3 rounded-xl transition-colors">
            Wyloguj się
          </button>
        </div>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
