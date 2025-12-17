"use client";

import dynamic from "next/dynamic";

// Dynamiczny import tutaj jest bezpieczny, bo jesteśmy w "use client"
const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-500 rounded-xl">
      Ładowanie mapy...
    </div>
  ),
});

// Ten wrapper przyjmuje propsy i przekazuje je do Mapy
export default function MapWrapper(props: any) {
  return <Map {...props} />;
}
