"use client";

import { useState } from "react";
import { Phone, Lock } from "lucide-react";
import { trackPhoneReveal } from "@/actions/trackLead"; // Import akcji

interface Props {
  phone: string;
  companyId: string; // <--- Nowy wymagany prop
}

export const PhoneRevealButton = ({ phone, companyId }: Props) => {
  const [isRevealed, setIsRevealed] = useState(false);

  const handleReveal = () => {
    // 1. Natychmiastowa reakcja UI (UX first)
    setIsRevealed(true);

    // 2. Wysłanie analityki w tle (Fire and forget)
    // Nie używamy 'await', żeby nie czekać na bazę danych
    trackPhoneReveal(companyId);
  };

  if (isRevealed) {
    // Stan ODKRYTY
    return (
      <a
        href={`tel:${phone}`}
        className="flex items-center justify-center gap-3 w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 mb-3 animate-in fade-in zoom-in"
      >
        <Phone size={18} /> {phone}
      </a>
    );
  }

  // Stan UKRYTY
  return (
    <button
      onClick={handleReveal}
      className="group relative flex items-center justify-center gap-3 w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200 mb-3 overflow-hidden"
    >
      <span className="flex items-center gap-2 relative z-10">
        <Phone size={18} />
        {phone.slice(0, 3)} *** ***
        <Lock
          size={14}
          className="text-gray-400 group-hover:text-white transition-colors"
        />
      </span>
      {/* Efekt shine */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-20 transition-opacity"></div>
    </button>
  );
};
