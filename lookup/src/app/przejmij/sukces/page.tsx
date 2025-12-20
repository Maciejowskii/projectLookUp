import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function ClaimSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-12 rounded-3xl shadow-xl max-w-md text-center">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Zgłoszenie wysłane!
        </h1>
        <p className="text-gray-500 mb-8">
          Dziękujemy. Nasz zespół zweryfikuje Twoje zgłoszenie. Sprawdź swoją
          skrzynkę mailową w ciągu najbliższych 24 godzin.
        </p>
        <Link
          href="/"
          className="block w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors"
        >
          Wróć na stronę główną
        </Link>
      </div>
    </div>
  );
}
