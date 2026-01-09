"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle2, Copy, Lock, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function SuccessClientContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const password = searchParams.get("p");
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-gray-100 text-center">
      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={40} />
      </div>

      <h1 className="text-3xl font-black text-gray-900 mb-2">Firma dodana!</h1>
      <p className="text-gray-600 mb-8">
        Twoja wizytówka jest już aktywna. Poniżej znajdziesz dane do logowania
        do panelu.
      </p>

      <div className="space-y-4 mb-8">
        {/* Login Box */}
        <div className="text-left bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">
            Email (Login)
          </label>
          <div className="flex items-center gap-3 text-gray-700 font-medium">
            <Mail size={18} className="text-blue-500" />
            <span className="truncate">{email || "Błąd adresu"}</span>
          </div>
        </div>

        {/* Password Box */}
        <div className="text-left bg-blue-50 p-4 rounded-2xl border border-blue-100 relative">
          <label className="text-xs font-bold text-blue-400 uppercase ml-1 mb-1 block">
            Hasło tymczasowe
          </label>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-blue-900 font-mono font-bold text-lg">
              <Lock size={18} className="text-blue-500" />
              <span>{password || "******"}</span>
            </div>
            <button
              onClick={copyToClipboard}
              className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
            >
              {copied ? (
                <CheckCircle2 size={20} className="text-green-600" />
              ) : (
                <Copy size={20} />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-8 text-sm text-amber-800 flex gap-3 text-left leading-relaxed">
        <span className="shrink-0 text-lg">⚠️</span>
        <p>
          Zapisz hasło teraz! Po opuszczeniu tej strony nie będziesz mógł go
          ponownie podejrzeć.
        </p>
      </div>

      <Link
        href="/strefa-partnera"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg flex justify-center items-center gap-2 group"
      >
        Przejdź do logowania
        <ArrowRight
          size={20}
          className="group-hover:translate-x-1 transition-transform"
        />
      </Link>
    </div>
  );
}
