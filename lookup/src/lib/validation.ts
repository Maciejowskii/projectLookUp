/**
 * Funkcje walidacji dla formularzy firm
 */

/**
 * Waliduje NIP - sprawdza format (10 cyfr) i sumę kontrolną
 * Algorytm sumy kontrolnej NIP:
 * 1. Pomnóż cyfry 1-9 przez współczynniki: 6, 5, 7, 2, 3, 4, 5, 6, 7
 * 2. Zsumuj wszystkie wyniki
 * 3. Weź resztę z dzielenia przez 11
 * 4. Porównaj z 10. cyfrą (cyfrą kontrolną)
 */
export function validateNIP(nip: string | null | undefined): { valid: boolean; error?: string } {
  if (!nip || nip.trim() === "") {
    return { valid: true }; // NIP jest opcjonalny
  }

  // Usuń wszystkie znaki niebędące cyframi
  const cleanNIP = nip.replace(/\D/g, "");

  if (cleanNIP.length !== 10) {
    return {
      valid: false,
      error: "NIP musi składać się z dokładnie 10 cyfr",
    };
  }

  // Sprawdź czy wszystkie znaki to cyfry
  if (!/^\d{10}$/.test(cleanNIP)) {
    return {
      valid: false,
      error: "NIP może zawierać tylko cyfry",
    };
  }

  // WALIDACJA SUMY KONTROLNEJ
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  let sum = 0;

  // Pomnóż pierwsze 9 cyfr przez współczynniki
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanNIP[i]) * weights[i];
  }

  // Oblicz resztę z dzielenia przez 11
  const checkDigit = sum % 11;

  // Jeśli reszta = 10, cyfra kontrolna powinna być 0
  const expectedCheckDigit = checkDigit === 10 ? 0 : checkDigit;
  const actualCheckDigit = parseInt(cleanNIP[9]);

  if (expectedCheckDigit !== actualCheckDigit) {
    return {
      valid: false,
      error: "Nieprawidłowy NIP - suma kontrolna nie zgadza się. Sprawdź czy numer jest poprawny.",
    };
  }

  return { valid: true };
}

/**
 * Waliduje kod pocztowy - format XX-XXX (5 cyfr)
 */
export function validatePostalCode(zip: string | null | undefined): { valid: boolean; error?: string } {
  if (!zip || zip.trim() === "") {
    return {
      valid: false,
      error: "Kod pocztowy jest wymagany",
    };
  }

  // Usuń spacje i myślniki, zostaw tylko cyfry
  const cleanZip = zip.replace(/\D/g, "");

  if (cleanZip.length !== 5) {
    return {
      valid: false,
      error: "Kod pocztowy musi składać się z 5 cyfr (format: XX-XXX)",
    };
  }

  // Sprawdź czy wszystkie znaki to cyfry
  if (!/^\d{5}$/.test(cleanZip)) {
    return {
      valid: false,
      error: "Kod pocztowy może zawierać tylko cyfry",
    };
  }

  return { valid: true };
}

/**
 * Waliduje miasto i kod pocztowy przez Nominatim API (OpenStreetMap)
 * Sprawdza czy miasto + kod pocztowy pasują do siebie
 */
export async function validateCityAndPostalCode(
  city: string,
  zip: string
): Promise<{ valid: boolean; error?: string; normalizedCity?: string }> {
  if (!city || city.trim() === "") {
    return {
      valid: false,
      error: "Miasto jest wymagane",
    };
  }

  const zipValidation = validatePostalCode(zip);
  if (!zipValidation.valid) {
    return zipValidation;
  }

  // Formatuj kod pocztowy jako XX-XXX
  const cleanZip = zip.replace(/\D/g, "");
  const formattedZip = `${cleanZip.slice(0, 2)}-${cleanZip.slice(2)}`;

  try {
    // Użyj Nominatim API (darmowe, OpenStreetMap)
    const query = `${formattedZip} ${city}, Poland`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&countrycodes=pl&limit=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Katalogo-Validation/1.0 (contact@katalogo.pl)",
      },
    });

    if (!response.ok) {
      console.error("Nominatim API error:", response.status, response.statusText);
      // Jeśli API nie działa, pozwól na dodanie (nie blokuj użytkownika)
      return { valid: true, normalizedCity: city.trim() };
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return {
        valid: false,
        error: `Nie znaleziono miasta "${city}" dla kodu pocztowego ${formattedZip}. Sprawdź czy miasto i kod pocztowy są poprawne.`,
      };
    }

    // Sprawdź czy wynik zawiera miasto i kod pocztowy
    const result = data[0];
    const displayName = result.display_name || "";
    const resultCity = result.address?.city || result.address?.town || result.address?.village || "";

    // Normalizuj nazwę miasta (usuń duplikaty, popraw wielkość liter)
    const normalizedCity = resultCity || city.trim();

    // Sprawdź czy kod pocztowy w wyniku pasuje
    const resultZip = result.address?.postcode || "";
    if (resultZip && resultZip.replace(/\D/g, "") !== cleanZip) {
      return {
        valid: false,
        error: `Kod pocztowy ${formattedZip} nie pasuje do miasta "${city}". Znaleziono kod: ${resultZip}`,
      };
    }

    // Sprawdź czy miasto w wynikach pasuje (z tolerancją na różnice w pisowni)
    const cityLower = city.toLowerCase().trim();
    const resultCityLower = resultCity.toLowerCase();
    const displayNameLower = displayName.toLowerCase();

    if (
      !resultCityLower.includes(cityLower) &&
      !cityLower.includes(resultCityLower) &&
      !displayNameLower.includes(cityLower)
    ) {
      // Jeśli nie ma dokładnego dopasowania, ale mamy wynik z Polski, pozwól (może być różnica w pisowni)
      if (result.address?.country_code === "pl") {
        return { valid: true, normalizedCity };
      }

      return {
        valid: false,
        error: `Nie znaleziono dokładnego dopasowania dla miasta "${city}" i kodu pocztowego ${formattedZip}. Znaleziono: ${displayName}`,
      };
    }

    return { valid: true, normalizedCity };
  } catch (error) {
    console.error("Error validating city/postal code:", error);
    // W przypadku błędu API, nie blokuj użytkownika (może być problem z siecią)
    return { valid: true, normalizedCity: city.trim() };
  }
}

/**
 * Formatuje kod pocztowy do standardowego formatu XX-XXX
 */
export function formatPostalCode(zip: string): string {
  const cleanZip = zip.replace(/\D/g, "");
  if (cleanZip.length === 5) {
    return `${cleanZip.slice(0, 2)}-${cleanZip.slice(2)}`;
  }
  return zip;
}

/**
 * Formatuje NIP do standardowego formatu (tylko cyfry)
 */
export function formatNIP(nip: string): string {
  return nip.replace(/\D/g, "");
}
