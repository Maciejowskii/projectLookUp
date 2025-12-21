"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, Plus } from "lucide-react";
import { usePathname } from "next/navigation";

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Efekt scrolla - zmienia tło na solidniejsze przy przewijaniu
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Kategorie", href: "/kategorie" },
    { name: "Dla Firm", href: "/dla-firm" },
    { name: "Strefa Partnera", href: "/strefa-partnera" },
  ];

  return (
    <>
      <nav
        className={`fixed w-full z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-200/50 py-3"
            : "bg-transparent py-5 border-b border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* --- LOGO (BEZ ZMIAN) --- */}
          <Link
            href="/"
            className="text-2xl font-extrabold tracking-tighter flex items-center gap-2 group"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg skew-x-[-10deg] group-hover:scale-105 transition-transform duration-300 shadow-lg shadow-blue-500/20"></div>
            <span className="text-gray-900">katalogo</span>
            <span className="text-blue-600">.</span>
          </Link>

          {/* --- DESKTOP MENU --- */}
          <div className="hidden md:flex items-center gap-1 bg-gray-100/50 p-1.5 rounded-full border border-gray-200/50 backdrop-blur-sm">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
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

          {/* --- RIGHT SIDE --- */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/dodaj-firme"
              className="group relative inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-full text-sm font-semibold overflow-hidden transition-all hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative flex items-center gap-2">
                <Plus
                  size={16}
                  className="text-blue-400 group-hover:text-white transition-colors"
                />
                Dodaj firmę
              </span>
            </Link>
          </div>

          {/* --- MOBILE HAMBURGER --- */}
          <button
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* --- MOBILE MENU OVERLAY --- */}
      <div
        className={`fixed inset-0 z-40 bg-white transform transition-transform duration-300 ease-in-out md:hidden pt-24 px-6 ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-4 text-lg font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-4 border-b border-gray-100 text-gray-800"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          <Link
            href="/dodaj-firme"
            className="mt-4 bg-blue-600 text-white py-4 rounded-xl text-center font-bold shadow-lg shadow-blue-200"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Dodaj firmę za darmo
          </Link>
        </div>
      </div>
    </>
  );
};
