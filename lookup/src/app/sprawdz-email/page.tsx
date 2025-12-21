import { Navbar } from "@/components/Navbar";
import { Mail } from "lucide-react";

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-grow flex items-center justify-center px-4">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl text-center max-w-lg w-full">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Sprawdź swoją skrzynkę
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Wysłaliśmy link aktywacyjny na podany adres email. Kliknij w niego,
            aby ustawić hasło i uzyskać dostęp do panelu firmy.
          </p>
          <div className="text-sm text-gray-400">
            Nie otrzymałeś wiadomości? Sprawdź folder Spam.
          </div>
        </div>
      </div>
    </div>
  );
}
