export const safeDecode = (s: string) => {
	if (!s) return s
	try {
		// dekoduje Artyku%C5%82Y -> Artykuły
		return decodeURIComponent(s)
	} catch {
		return s
	}
}

export const getInitial = (name?: string) => {
	const s = safeDecode((name ?? '').trim())
	const m = s.match(/[\p{L}\p{N}]/u) // pierwsza litera/cyfra Unicode
	return (m?.[0] ?? '?').toUpperCase()
}
