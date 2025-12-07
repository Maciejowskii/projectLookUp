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
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="subdomain" value={subdomain} />
      <input type="hidden" name="slug" value={slug} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Imię i nazwisko
        </label>
        <input
          name="contactName"
          required
          type="text"
          className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Jan Kowalski"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Telefon
        </label>
        <input
          name="phone"
          required
          type="tel"
          className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="500 600 700"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email (opcjonalnie)
        </label>
        <input
          name="email"
          type="email"
          className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="biuro@firma.pl"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition mt-2"
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
