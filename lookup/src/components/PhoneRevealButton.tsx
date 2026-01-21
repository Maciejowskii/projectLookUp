"use client";

import { useState, useEffect } from "react";
import { Phone, Lock, Mail, MessageSquare } from "lucide-react";
import { trackPhoneReveal } from "@/actions/trackLead";

interface Props {
  phone: string;
  companyId: string;
}

export const PhoneRevealButton = ({ phone, companyId }: Props) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    description: "",
  });

  // Sprawdź czy użytkownik jest zalogowany
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setIsLoggedIn(!!data.user);
        if (data.user) {
          setFormData((prev) => ({
            ...prev,
            email: data.user.email || "",
          }));
        }
      })
      .catch(() => setIsLoggedIn(false));
  }, []);

  const handleReveal = () => {
    // Jeśli użytkownik nie jest zalogowany, pokaż formularz
    if (isLoggedIn === false) {
      setShowForm(true);
      return;
    }

    // Jeśli zalogowany lub status nieznany, od razu pokaż numer
    revealPhone();
  };

  const revealPhone = () => {
    setIsRevealed(true);
    setShowForm(false);

    // Wyślij dane do trackPhoneReveal
    trackPhoneReveal(
      companyId,
      formData.email || undefined,
      formData.phone || undefined,
      formData.description || undefined
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.phone) {
      alert("Proszę podać email i numer telefonu");
      return;
    }
    revealPhone();
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

  if (showForm && isLoggedIn === false) {
    // Formularz do zbierania danych dla niezalogowanych
    return (
      <form
        onSubmit={handleFormSubmit}
        className="bg-white border border-gray-200 rounded-xl p-4 mb-3 space-y-3 shadow-sm"
      >
        <p className="text-sm font-semibold text-gray-900 mb-2">
          Podaj dane kontaktowe, aby zobaczyć numer telefonu
        </p>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
            Email *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400" size={16} />
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="twoj@email.pl"
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
            Numer telefonu *
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 text-gray-400" size={16} />
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="+48 123 456 789"
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
            Opis zapytania (opcjonalnie)
          </label>
          <div className="relative">
            <MessageSquare
              className="absolute left-3 top-3 text-gray-400"
              size={16}
            />
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Np. Chciałbym zapytać o..."
              rows={2}
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors text-sm"
          >
            Zobacz numer
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            Anuluj
          </button>
        </div>
      </form>
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
