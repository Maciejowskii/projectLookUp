/**
 * Funkcje walidacji dla formularzy firm
 *
 * WALIDACJA MIEJSCOWOŚĆ + KOD POCZTOWY – możliwe podejścia:
 *
 * 1. Nominatim (OpenStreetMap) – używane domyślnie
 *    Sprawdza, czy para miasto + kod istnieje w Polsce. Darmowe, bez klucza.
 *    Ograniczenia: rate limit, czasem brak małych miejscowości.
 *
 * 2. API Intami (kodpocztowy.intami.pl) – baza Poczty Polskiej
 *    Włącz przez USE_INTAMI_POSTAL_CHECK=true. 50 zapytań/dzień/IP za darmo.
 *    Bardziej precyzyjne dla polskich kodów i miejscowości.
 *
 * 3. Statyczna lista (JSON/CSV)
 *    Można dodać plik z kodami ↔ miejscowości (np. z GUS/TERYT lub pastusiak/kodypocztowe)
 *    i walidować bez zewnętrznych API. Wymaga okresowej aktualizacji danych.
 *
 * 4. GUS TERYT API (api.stat.gov.pl)
 *    Oficjalne dane, wymaga rejestracji (teryt_ws1@stat.gov.pl). Format XML.
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
	if (!nip || nip.trim() === '') {
		return {
			valid: false,
			error: 'NIP jest wymagany',
		}
	}

	// Usuń wszystkie znaki niebędące cyframi
	const cleanNIP = nip.replace(/\D/g, '')

	if (cleanNIP.length !== 10) {
		return {
			valid: false,
			error: 'NIP musi składać się z dokładnie 10 cyfr',
		}
	}

	// Sprawdź czy wszystkie znaki to cyfry
	if (!/^\d{10}$/.test(cleanNIP)) {
		return {
			valid: false,
			error: 'NIP może zawierać tylko cyfry',
		}
	}

	// Odrzuć znane NIP-y testowe / fałszywe (mają poprawną sumę kontrolną, ale nie są realne)
	const BLOCKED_NIPS = [
		'0000000000',
		'1111111111',
		'2222222222',
		'3333333333',
		'4444444444',
		'5555555555',
		'6666666666',
		'7777777777',
		'8888888888',
		'9999999999',
		'1234567890',
		'0123456789',
		'9876543210',
		'1111111118',
	]
	if (BLOCKED_NIPS.includes(cleanNIP)) {
		return {
			valid: false,
			error: 'Ten NIP wygląda na testowy lub nieprawidłowy. Podaj prawdziwy NIP firmy.',
		}
	}

	// WALIDACJA SUMY KONTROLNEJ
	const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
	let sum = 0

	// Pomnóż pierwsze 9 cyfr przez współczynniki
	for (let i = 0; i < 9; i++) {
		sum += parseInt(cleanNIP[i]) * weights[i]
	}

	// Oblicz resztę z dzielenia przez 11
	const checkDigit = sum % 11

	// Jeśli reszta = 10, cyfra kontrolna powinna być 0
	const expectedCheckDigit = checkDigit === 10 ? 0 : checkDigit
	const actualCheckDigit = parseInt(cleanNIP[9])

	if (expectedCheckDigit !== actualCheckDigit) {
		return {
			valid: false,
			error: 'Nieprawidłowy NIP - suma kontrolna nie zgadza się. Sprawdź czy numer jest poprawny.',
		}
	}

	return { valid: true }
}

/**
 * Waliduje kod pocztowy - format XX-XXX (5 cyfr)
 */
export function validatePostalCode(zip: string | null | undefined): { valid: boolean; error?: string } {
	if (!zip || zip.trim() === '') {
		return {
			valid: false,
			error: 'Kod pocztowy jest wymagany',
		}
	}

	// Usuń spacje i myślniki, zostaw tylko cyfry
	const cleanZip = zip.replace(/\D/g, '')

	if (cleanZip.length !== 5) {
		return {
			valid: false,
			error: 'Kod pocztowy musi składać się z 5 cyfr (format: XX-XXX)',
		}
	}

	// Sprawdź czy wszystkie znaki to cyfry
	if (!/^\d{5}$/.test(cleanZip)) {
		return {
			valid: false,
			error: 'Kod pocztowy może zawierać tylko cyfry',
		}
	}

	return { valid: true }
}

/**
 * Waliduje miasto i kod pocztowy przez Nominatim API (OpenStreetMap)
 * Sprawdza czy miasto + kod pocztowy pasują do siebie
 */
export async function validateCityAndPostalCode(
	city: string,
	zip: string,
): Promise<CityPostalResult> {
	if (!city || city.trim() === '') {
		return {
			valid: false,
			error: 'Miasto jest wymagane',
		}
	}

	const zipValidation = validatePostalCode(zip)
	if (!zipValidation.valid) {
		return zipValidation
	}

	// Formatuj kod pocztowy jako XX-XXX
	const cleanZip = zip.replace(/\D/g, '')
	const formattedZip = `${cleanZip.slice(0, 2)}-${cleanZip.slice(2)}`

	try {
		// Użyj Nominatim API (darmowe, OpenStreetMap)
		const query = `${formattedZip} ${city}, Poland`
		const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
			query,
		)}&format=json&countrycodes=pl&limit=1`

		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Katalogo-Validation/1.0 (contact@katalogo.pl)',
			},
		})

		if (!response.ok) {
			console.error('Nominatim API error:', response.status, response.statusText)
			// Jeśli API nie działa, pozwól na dodanie (nie blokuj użytkownika)
			return { valid: true, normalizedCity: city.trim() }
		}

		const data = await response.json()

		if (!data || data.length === 0) {
			const fallbackSuggestions = await getCitiesForPostalCode(zip)
			return {
				valid: false,
				error: `Nie znaleziono miasta "${city}" dla kodu pocztowego ${formattedZip}. Sprawdź czy miasto i kod pocztowy są poprawne.`,
				suggestions: fallbackSuggestions,
			}
		}

		// Sprawdź czy wynik zawiera miasto i kod pocztowy
		const result = data[0]
		const displayName = result.display_name || ''
		const resultCity = result.address?.city || result.address?.town || result.address?.village || ''

		// Normalizuj nazwę miasta (usuń duplikaty, popraw wielkość liter)
		const normalizedCity = resultCity || city.trim()

		// Sprawdź czy kod pocztowy w wyniku pasuje
		const resultZip = result.address?.postcode || ''
		if (resultZip && resultZip.replace(/\D/g, '') !== cleanZip) {
			const fallbackSuggestions = await getCitiesForPostalCode(zip)
			return {
				valid: false,
				error: `Kod pocztowy ${formattedZip} nie pasuje do miasta "${city}". Znaleziono kod: ${resultZip}`,
				suggestions: fallbackSuggestions,
			}
		}

		// Sprawdź czy miasto w wynikach pasuje (z tolerancją na różnice w pisowni)
		const cityLower = city.toLowerCase().trim()
		const resultCityLower = resultCity.toLowerCase()
		const displayNameLower = displayName.toLowerCase()

		if (
			!resultCityLower.includes(cityLower) &&
			!cityLower.includes(resultCityLower) &&
			!displayNameLower.includes(cityLower)
		) {
			if (result.address?.country_code === 'pl') {
				return { valid: true, normalizedCity }
			}

			const fallbackSuggestions = resultCity ? [resultCity] : await getCitiesForPostalCode(zip)
			return {
				valid: false,
				error: `Nie znaleziono dokładnego dopasowania dla miasta "${city}" i kodu pocztowego ${formattedZip}. Znaleziono: ${displayName}`,
				suggestions: fallbackSuggestions,
			}
		}

		return { valid: true, normalizedCity }
	} catch (error) {
		console.error('Error validating city/postal code:', error)
		// W przypadku błędu API, nie blokuj użytkownika (może być problem z siecią)
		return { valid: true, normalizedCity: city.trim() }
	}
}

/** Wynik walidacji miejscowości + kodu (ze znormalizowaną nazwą) */
export type CityPostalResult = {
	valid: boolean
	error?: string
	normalizedCity?: string
	suggestions?: string[]
}

function extractCityNames(items: Record<string, unknown>[]): string[] {
	const cityFieldNames = [
		'Miejscowosc',
		'Miejscowość',
		'miejscowosc',
		'miejscowość',
		'MIEJSCOWOSC',
		'city',
		'name',
		'town',
		'village',
	]

	const cities: string[] = []

	for (const item of items) {
		let found = false
		for (const fieldName of cityFieldNames) {
			if (item[fieldName] && typeof item[fieldName] === 'string') {
				cities.push(item[fieldName] as string)
				found = true
				break
			}
		}
		if (!found) {
			const lowerKey = Object.keys(item).find(
				k =>
					k.toLowerCase().includes('miejscow') ||
					k.toLowerCase().includes('miasto') ||
					k.toLowerCase().includes('city'),
			)
			if (lowerKey && typeof item[lowerKey] === 'string' && (item[lowerKey] as string).length > 1) {
				cities.push(item[lowerKey] as string)
			}
		}
	}

	return [...new Set(cities.filter(Boolean))]
}

/**
 * Pobiera listę miejscowości dla danego kodu pocztowego.
 * Próbuje Intami API, fallback na Nominatim.
 */
export async function getCitiesForPostalCode(zip: string): Promise<string[]> {
	const cleanZip = zip.replace(/\D/g, '')
	if (cleanZip.length !== 5) return []

	const formattedZip = `${cleanZip.slice(0, 2)}-${cleanZip.slice(2)}`

	try {
		const url = `https://kodpocztowy.intami.pl/api/${formattedZip}`
		const response = await fetch(url, {
			headers: { Accept: 'application/json' },
			next: { revalidate: 86400 },
		})

		if (response.ok) {
			const data = await response.json()
			const items = Array.isArray(data) ? data : [data]
			const cities = extractCityNames(items)

			if (cities.length === 0 && items.length > 0) {
				console.warn('[getCitiesForPostalCode] Intami returned data but no city names parsed. Raw:', JSON.stringify(items[0]))
			}

			if (cities.length > 0) return cities
		}
	} catch (error) {
		console.error('[getCitiesForPostalCode] Intami error:', error)
	}

	try {
		const url = `https://nominatim.openstreetmap.org/search?postalcode=${formattedZip}&country=Poland&format=json&addressdetails=1&limit=5`
		const response = await fetch(url, {
			headers: { 'User-Agent': 'Katalogo-Validation/1.0 (contact@katalogo.pl)' },
		})

		if (response.ok) {
			const data = await response.json()
			const cities = data
				.map((r: Record<string, unknown>) => {
					const addr = r.address as Record<string, string> | undefined
					return addr?.city || addr?.town || addr?.village || ''
				})
				.filter(Boolean)
			return [...new Set(cities)] as string[]
		}
	} catch (error) {
		console.error('[getCitiesForPostalCode] Nominatim error:', error)
	}

	return []
}

/**
 * Waliduje miasto i kod pocztowy przez API Intami (baza Poczty Polskiej).
 * Limit: 50 zapytań/dzień na IP (darmowo). Dla większego ruchu: RapidAPI / plany płatne.
 * Włącz przez USE_INTAMI_POSTAL_CHECK=true.
 */
export async function validateCityAndPostalCodeIntami(city: string, zip: string): Promise<CityPostalResult> {
	if (!city || city.trim() === '') {
		return { valid: false, error: 'Miasto jest wymagane' }
	}

	const zipValidation = validatePostalCode(zip)
	if (!zipValidation.valid) return zipValidation

	const cleanZip = zip.replace(/\D/g, '')
	const formattedZip = `${cleanZip.slice(0, 2)}-${cleanZip.slice(2)}`
	const cityNorm = city.trim()
	const cityLower = cityNorm.toLowerCase()

	try {
		const url = `https://kodpocztowy.intami.pl/api/${formattedZip}`
		const response = await fetch(url, {
			headers: { Accept: 'application/json' },
			next: { revalidate: 0 },
		})

		if (response.status === 429) {
			console.warn('[validation] Intami rate limit (50/day); fallback to Nominatim')
			return validateCityAndPostalCode(city, zip)
		}
		if (!response.ok) {
			return { valid: false, error: `Kod pocztowy ${formattedZip} nie istnieje w bazie Poczty Polskiej.` }
		}

		const data = await response.json()
		const items = Array.isArray(data) ? data : [data]

		if (!items.length) {
			return {
				valid: false,
				error: `Nie znaleziono miejscowości dla kodu ${formattedZip}. Sprawdź kod pocztowy.`,
			}
		}

		const miejscowosci = extractCityNames(items as Record<string, unknown>[])

		if (miejscowosci.length === 0 && items.length > 0) {
			console.warn('[validateCityAndPostalCodeIntami] Could not extract city names. Raw item keys:', Object.keys(items[0]))
			return { valid: true, normalizedCity: cityNorm }
		}

		const match = miejscowosci.some((m: string) => {
			const mLower = m.toLowerCase().trim()
			return mLower === cityLower || mLower.includes(cityLower) || cityLower.includes(mLower)
		})
		const normalizedCity =
			miejscowosci.find((m: string) => m.toLowerCase().trim().includes(cityLower)) ?? miejscowosci[0] ?? cityNorm

		if (!match) {
			const suggestionList = miejscowosci.slice(0, 5)
			return {
				valid: false,
				error: `Miejscowość "${cityNorm}" nie pasuje do kodu ${formattedZip}. Dla tego kodu: ${suggestionList.join(', ')}${miejscowosci.length > 5 ? '…' : ''}.`,
				suggestions: suggestionList,
			}
		}

		return { valid: true, normalizedCity }
	} catch (error) {
		console.error('Error validating city/postal (Intami):', error)
		return validateCityAndPostalCode(city, zip)
	}
}

/**
 * Walidacja miejscowości + kod pocztowy: używa Intami jeśli włączone (USE_INTAMI_POSTAL_CHECK),
 * w przeciwnym razie Nominatim. Daje to możliwość precyzyjnej walidacji na bazie Poczty Polskiej.
 */
export async function validateCityAndPostalCodeStrict(city: string, zip: string): Promise<CityPostalResult> {
	if (process.env.USE_INTAMI_POSTAL_CHECK === 'true') {
		return validateCityAndPostalCodeIntami(city, zip)
	}
	return validateCityAndPostalCode(city, zip)
}

/**
 * Formatuje kod pocztowy do standardowego formatu XX-XXX
 */
export function formatPostalCode(zip: string): string {
	const cleanZip = zip.replace(/\D/g, '')
	if (cleanZip.length === 5) {
		return `${cleanZip.slice(0, 2)}-${cleanZip.slice(2)}`
	}
	return zip
}

/**
 * Formatuje NIP do standardowego formatu (tylko cyfry)
 */
export function formatNIP(nip: string): string {
	return nip.replace(/\D/g, '')
}
