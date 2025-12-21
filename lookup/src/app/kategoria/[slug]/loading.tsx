import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      <main className="container mx-auto px-4 pt-32 pb-20 flex-grow">
        {/* HEADER KATEGORII */}
        <div className="mb-12">
          <Skeleton className="h-4 w-32 mb-4" /> {/* Label */}
          <Skeleton className="h-12 w-3/4 md:w-1/3 mb-4" /> {/* Tytuł */}
          <Skeleton className="h-6 w-full md:w-1/2" /> {/* Opis */}
        </div>

        {/* LISTA FIRM (Generujemy 5 kafelków) */}
        <div className="grid grid-cols-1 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-start"
            >
              {/* Logo Skeleton */}
              <Skeleton className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0" />

              <div className="flex-grow w-full">
                {/* Tytuł i Badge */}
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="h-8 w-1/2 md:w-1/3" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>

                {/* Adres */}
                <Skeleton className="h-4 w-1/3 mb-6" />

                {/* Opis (3 linie) */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
