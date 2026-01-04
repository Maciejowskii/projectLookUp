export const safeDecode = (s: string) => {
	if (!s) return s
	// dekoduj tylko jeśli wygląda jak percent-encoding
	if (!/%[0-9A-Fa-f]{2}/.test(s)) return s
	try {
		return decodeURIComponent(s)
	} catch {
		return s
	}
}

export const getInitial = (name?: string) => {
	const s = safeDecode((name ?? '').trim())
	const m = s.match(/[\p{L}\p{N}]/u)
	return (m?.[0] ?? '?').toUpperCase()
}
