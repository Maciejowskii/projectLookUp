import Link from "next/link";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans padding-top-32">
      <Navbar />

      <main className="flex-grow flex items-center justify-center p-4 padding-top-32 padding-bottom-20 margin-top-128 margin-bottom-20">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl max-w-lg text-center border border-gray-100">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle size={40} />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">Dziękujemy!</h1>

          <p className="text-gray-500 mb-8 text-lg">
            Twoja wiadomość została wysłana pomyślnie. <br />
            Skontaktujemy się z Tobą najszybciej jak to możliwe.
          </p>

          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              Wróć na stronę główną
            </Link>

            <Link
              href="/kategorie"
              className="block w-full text-gray-500 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} /> Przeglądaj firmy
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
