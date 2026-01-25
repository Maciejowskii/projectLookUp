"use client";

import { createLead } from "@/app/actions";
import { useState } from "react";

export default function ClaimForm({
  companyId,
  subdomain,
  slug,
}: {
  companyId: string;
  subdomain: string;
  slug: string;
}) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function handleSubmit(formData: FormData) {
    const result = await createLead(formData);
    if (result.success) {
      setStatus("success");
      setMsg(result.message);
    } else {
      setStatus("error");
      setMsg(result.message);
    }
  }

  if (status === "success") {
    return (
      <div className="bg-green-50 p-6 rounded-lg border border-green-200 text-center">
        <h3 className="text-green-800 font-bold text-lg">Dziękujemy! 🎉</h3>
        <p className="text-green-600 mt-2">{msg}</p>
        <p className="text-sm text-gray-500 mt-4">
          Nasz konsultant skontaktuje się z Tobą w ciągu 24h.
        </p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4 md:space-y-6">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="subdomain" value={subdomain} />
      <input type="hidden" name="slug" value={slug} />

      <div>
        <label className="block text-sm md:text-base font-medium text-gray-700 mb-2">
          Imię i nazwisko
        </label>
        <input
          name="contactName"
          required
          type="text"
          autoComplete="name"
          inputMode="text"
          className="w-full border-2 border-gray-200 rounded-xl p-3 md:p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none touch-manipulation bg-white text-gray-900"
          style={{ fontSize: '16px' }}
          placeholder="Jan Kowalski"
        />
      </div>

      <div>
        <label className="block text-sm md:text-base font-medium text-gray-700 mb-2">
          Telefon
        </label>
        <input
          name="phone"
          required
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          className="w-full border-2 border-gray-200 rounded-xl p-3 md:p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none touch-manipulation bg-white text-gray-900"
          style={{ fontSize: '16px' }}
          placeholder="500 600 700"
        />
      </div>

      <div>
        <label className="block text-sm md:text-base font-medium text-gray-700 mb-2">
          Email (opcjonalnie)
        </label>
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          className="w-full border-2 border-gray-200 rounded-xl p-3 md:p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none touch-manipulation bg-white text-gray-900"
          style={{ fontSize: '16px' }}
          placeholder="biuro@firma.pl"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-4 md:py-3 rounded-xl font-bold md:hover:bg-blue-700 active:bg-blue-700 active:scale-[0.98] shadow-lg shadow-blue-200 transition-all mt-2 touch-manipulation min-h-[44px] text-base md:text-sm"
      >
        Odbierz dostęp do wizytówki
      </button>

      {status === "error" && (
        <p className="text-red-500 text-sm text-center">{msg}</p>
      )}

      <p className="text-[10px] text-center text-gray-400">
        Klikając, akceptujesz regulamin i zamawiasz darmową konsultację.
      </p>
    </form>
  );
}
