"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";

export const CookieBanner = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Sprawdzamy czy użytkownik już zaakceptował
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setShow(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie-consent", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white border border-gray-100 p-6 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-gray-900">Dbamy o Twoją prywatność 🍪</h3>
        <button
          onClick={() => setShow(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-6 leading-relaxed">
        Używamy plików cookies, aby dostarczać Ci najlepsze doświadczenia na
        katalogo. Dowiedz się więcej w naszej{" "}
        <Link
          href="/legal/cookies"
          className="text-blue-600 underline hover:no-underline"
        >
          Polityce Cookies
        </Link>
        .
      </p>
      <div className="flex gap-3">
        <button
          onClick={accept}
          className="flex-1 bg-gray-900 text-white font-semibold py-2.5 rounded-xl hover:bg-gray-800 transition-colors text-sm"
        >
          Akceptuję
        </button>
        <button
          onClick={() => setShow(false)}
          className="flex-1 bg-gray-100 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-200 transition-colors text-sm"
        >
          Odrzuć
        </button>
      </div>
    </div>
  );
};
