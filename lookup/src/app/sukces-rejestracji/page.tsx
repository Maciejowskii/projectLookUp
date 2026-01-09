import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import SuccessClientContent from "./SuccessClientContent";

export default function RegistrationSuccessPage() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow flex items-center justify-center pt-32 pb-20 px-4">
        {/* Suspense jest wymagany, bo komponent w środku używa useSearchParams */}
        <Suspense
          fallback={
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <Loader2 className="animate-spin w-10 h-10" />
              <p className="font-medium">Przygotowywanie danych...</p>
            </div>
          }
        >
          <SuccessClientContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
