"use client";
import { useState } from "react";

export default function ContactForm({
  companyName,
  companyId,
}: {
  companyName: string;
  companyId: string;
}) {
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: any) {
    e.preventDefault();
    // Tutaj strzał do API /api/contact
    // Na MVP wystarczy zapisać to jako LEAD w bazie z innym typem (np. type="CLIENT_INQUIRY")
    // lub wysłać console.log "Wiadomość wysłana"
    setSent(true);
  }

  if (sent)
    return (
      <div className="text-center py-8 text-green-600 bg-green-50 rounded-xl">
        <p className="font-bold">Wiadomość wysłana!</p>
        <p className="text-xs mt-1">Powiadomimy firmę o Twoim zapytaniu.</p>
      </div>
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        required
        name="email"
        type="email"
        placeholder="Twój e-mail"
        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
      />
      <textarea
        required
        name="message"
        rows={4}
        placeholder={`Dzień dobry, jestem zainteresowany usługami firmy ${companyName}...`}
        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
      ></textarea>
      <button
        type="submit"
        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
      >
        Wyślij wiadomość
      </button>
    </form>
  );
}
