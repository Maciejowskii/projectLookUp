
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { setPasswordAction } from "@/actions/authActions"; 
import { Lock, ArrowRight, XCircle } from "lucide-react";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <ErrorScreen message="Brak tokenu weryfikacyjnego." />;
  }

  // 1. Sprawdzamy token w bazie
  const verificationData = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verificationData || new Date() > verificationData.expires) {
    return <ErrorScreen message="Link wygasł lub jest nieprawidłowy." />;
  }

  // 2. Token OK - wyświetlamy formularz
  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Navbar />
      <div className="flex-grow flex items-center justify-center pt-20 pb-20 px-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full">
          <div className="text-center mb-8">
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              Weryfikacja udana
            </span>
            <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">
              Ustaw hasło
            </h1>
            <p className="text-gray-500">
              To ostatni krok. Ustaw bezpieczne hasło do swojego konta
              firmowego.
            </p>
          </div>

          <form action={setPasswordAction} className="space-y-6">
            <input type="hidden" name="token" value={token} />
            <input
              type="hidden"
              name="email"
              value={verificationData.identifier}
            />

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">
                Nowe hasło
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-3.5 text-gray-400"
                  size={18}
                />
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="Min. 8 znaków"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <button className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
              Aktywuj konto i zaloguj <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Navbar />
      <div className="flex-grow flex items-center justify-center pt-20 pb-20 px-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center">
          <XCircle className="text-red-500 w-16 h-16 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Błąd weryfikacji
          </h1>
          <p className="text-gray-500">{message}</p>
        </div>
      </div>
    </div>
  );
}
