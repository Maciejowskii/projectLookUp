"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { UserMenu } from "./UserMenu";

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Efekt scrolla - zmienia tło na solidniejsze przy przewijaniu
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Zamknij menu przy kliknięciu poza nim
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const navLinks = [
    { name: "Kategorie", href: "/kategorie" },
    { name: "Dla Firm", href: "/dla-firm" },
    { name: "Strefa Partnera", href: "/strefa-partnera" },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/50 py-2 md:py-3"
            : "bg-white/95 backdrop-blur-sm py-3 md:py-5 border-b border-gray-200/30"
        }`}
        style={{
          paddingTop: `calc(0.75rem + var(--safe-area-inset-top))`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between overflow-hidden">
          {/* --- LOGO (Mobile-First) --- */}
          <Link
            href="/"
            className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tighter flex items-center gap-2 group touch-manipulation flex-shrink-0 min-w-0"
            aria-label="Strona główna"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-blue-600 rounded-lg skew-x-[-10deg] group-active:scale-95 transition-transform duration-200 shadow-lg shadow-blue-500/20 flex-shrink-0"></div>
            <span className="text-gray-900 truncate">katalogo</span>
            <span className="text-blue-600 flex-shrink-0">.</span>
          </Link>

          {/* --- DESKTOP MENU (Hidden on mobile) --- */}
          <div className="hidden md:flex items-center gap-1 bg-gray-100/50 p-1.5 rounded-full border border-gray-200/50 backdrop-blur-sm">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 lg:px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 touch-manipulation ${
                    isActive
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* --- RIGHT SIDE (Desktop) --- */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/dodaj-firme"
              className="group relative inline-flex items-center gap-2 px-4 lg:px-5 py-2 bg-gray-900 text-white rounded-full text-sm font-semibold overflow-hidden transition-all hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 touch-manipulation active:scale-95"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative flex items-center gap-2">
                <Plus
                  size={16}
                  className="text-blue-400 group-hover:text-white transition-colors"
                />
                <span className="hidden lg:inline">Dodaj firmę</span>
                <span className="lg:hidden">Dodaj</span>
              </span>
            </Link>
            <UserMenu />
          </div>

          {/* --- MOBILE HAMBURGER (Touch-friendly 44x44px) --- */}
          <button
            className="md:hidden p-3 text-gray-600 active:bg-gray-100 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* --- MOBILE MENU DRAWER (Slide-in from right) --- */}
      <div
        className={`fixed inset-0 z-40 bg-white transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          paddingTop: `calc(4rem + var(--safe-area-inset-top))`,
          paddingBottom: `var(--safe-area-inset-bottom)`,
        }}
      >
        {/* Backdrop overlay */}
        {isMobileMenuOpen && (
          <div
            className="absolute inset-0 bg-black/20 -z-10"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        <div className="h-full bg-white overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-2">
            {/* User menu na górze mobile */}
            <div className="pb-4 border-b border-gray-100 mb-4">
              <UserMenu />
            </div>
            
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`py-4 px-4 rounded-xl text-base font-medium touch-manipulation active:bg-gray-100 transition-colors min-h-[44px] flex items-center ${
                    isActive
                      ? "bg-blue-50 text-blue-600 font-semibold"
                      : "text-gray-800"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              );
            })}
            
            <Link
              href="/dodaj-firme"
              className="mt-4 bg-blue-600 text-white py-4 px-4 rounded-xl text-center font-bold shadow-lg shadow-blue-200 touch-manipulation active:bg-blue-700 active:scale-95 transition-all min-h-[44px] flex items-center justify-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Dodaj firmę za darmo
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
