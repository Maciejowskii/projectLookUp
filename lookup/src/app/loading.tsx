import { Navbar } from "@/components/Navbar";
import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      {/* HERO SECTION */}
      <div className="pt-32 pb-20 px-6 container mx-auto">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <Skeleton className="h-8 w-48 rounded-full mb-8" />
          <Skeleton className="h-16 md:h-24 w-3/4 mb-8" />
          <Skeleton className="h-16 md:h-24 w-1/2 mb-10" />

          {/* Search Bar Skeleton */}
          <Skeleton className="h-16 w-full max-w-3xl rounded-2xl" />
        </div>
      </div>

      {/* KATEGORIE */}
      <div className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <Skeleton className="h-10 w-64 mb-12 mx-auto" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl bg-white" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
