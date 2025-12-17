"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// --- FIX IKONEK (Metoda CDN - najbardziej niezawodna) ---
// Nadpisujemy domyślne ścieżki do obrazków na te z serwera unpkg
const iconUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png";
const iconRetinaUrl =
  "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png";
const shadowUrl =
  "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
  iconUrl: iconUrl,
  iconRetinaUrl: iconRetinaUrl,
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

// Ustawiamy to jako domyślne dla wszystkich markerów
L.Marker.prototype.options.icon = defaultIcon;

interface CompanyLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  slug: string;
  city: string;
  address: string;
}

export default function Map({ companies }: { companies: CompanyLocation[] }) {
  // Środek Polski (default center)
  const defaultCenter: [number, number] = [52.0693, 19.4803];

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-lg border border-gray-200 z-0">
      <MapContainer
        center={defaultCenter}
        zoom={6}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {companies.map(
          (company) =>
            // Renderujemy tylko jeśli są koordynaty
            company.lat &&
            company.lng && (
              <Marker key={company.id} position={[company.lat, company.lng]}>
                <Popup>
                  <div className="text-sm min-w-[150px]">
                    <strong className="block text-base mb-1 text-gray-900">
                      {company.name}
                    </strong>
                    <p className="text-gray-600 mb-2 text-xs">
                      {company.address}, {company.city}
                    </p>
                    {/* Tutaj linkujemy dynamicznie, zakładam że w routingu używasz subdomeny, 
                        ale w teście damy link relatywny */}
                    <span className="text-xs text-blue-600">
                      ID: {company.slug}
                    </span>
                  </div>
                </Popup>
              </Marker>
            )
        )}
      </MapContainer>
    </div>
  );
}
