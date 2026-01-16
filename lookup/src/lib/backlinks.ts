import { prisma } from '@/lib/prisma'

/**
 * Smart backlink generator
 * Znajduje istniejące artykuły i dodaje linki do nich w treści
 */
export async function injectBacklinks(content: string, currentPostId: string, limit: number = 3): Promise<string> {
	try {
		// Pobierz inne artykuły (poza obecnym)
		const otherPosts = await prisma.post.findMany({
			where: {
				published: true,
				id: currentPostId ? { not: currentPostId } : undefined,
			},
			select: {
				id: true,
				slug: true,
				title: true,
			},
			orderBy: { createdAt: 'desc' },
			take: limit * 3, // Pobierz więcej, żeby miał z czego wybrać
		})

		if (otherPosts.length === 0) {
			console.log('⚠️ Brak innych artykułów do backlinkowania')
			return content
		}

		// Losowo wybór artykułów
		const selectedPosts = otherPosts.sort(() => Math.random() - 0.5).slice(0, Math.min(limit, otherPosts.length))

		let updatedContent = content
		let linksAdded = 0

		// Znajdź wszystkie paragrafy </p> w treści
		const paragraphEndPositions: number[] = []
		let searchStart = 0
		while (true) {
			const pos = updatedContent.indexOf('</p>', searchStart)
			if (pos === -1) break
			paragraphEndPositions.push(pos)
			searchStart = pos + 4
		}

		if (paragraphEndPositions.length < 3) {
			console.log('⚠️ Za mało paragrafów do backlinkowania')
			return content
		}

		// Wybierz pozycje do wstawienia linków (rozłożone równomiernie)
		const insertPositions = [
			Math.floor(paragraphEndPositions.length * 0.25),
			Math.floor(paragraphEndPositions.length * 0.5),
			Math.floor(paragraphEndPositions.length * 0.75),
		].slice(0, selectedPosts.length)

		// Wstaw linki od końca (żeby nie zepsuć pozycji)
		for (let i = selectedPosts.length - 1; i >= 0; i--) {
			const post = selectedPosts[i]
			const posIndex = insertPositions[i]
			if (posIndex === undefined || !paragraphEndPositions[posIndex]) continue

			const insertPos = paragraphEndPositions[posIndex]
			const backlink = `<a href="/blog/${post.slug}" class="text-blue-600 hover:underline font-semibold">${post.title}</a>`
			const contextLink = ` Przeczytaj również: ${backlink}.`

			updatedContent = updatedContent.substring(0, insertPos) + contextLink + updatedContent.substring(insertPos)
			linksAdded++
		}

		// Dodaj też sekcję "Zobacz również" na końcu artykułu
		if (selectedPosts.length > 0) {
			const seeAlsoSection = `
<div class="mt-12 p-6 bg-blue-50 rounded-2xl border border-blue-100">
  <h3 class="font-bold text-lg text-gray-900 mb-4">Zobacz również</h3>
  <ul class="space-y-2">
    ${selectedPosts.map(p => `<li><a href="/blog/${p.slug}" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">→ ${p.title}</a></li>`).join('\n    ')}
  </ul>
</div>`
			updatedContent += seeAlsoSection
		}

		console.log(`✅ Dodano ${linksAdded} backlinków + sekcję "Zobacz również"`)
		return updatedContent
	} catch (error) {
		console.error('❌ Błąd podczas dodawania backlinków:', error)
		return content // Zwróć oryginalną zawartość jeśli błąd
	}
}

/**
 * Get related posts based on title keywords
 */
export async function getRelatedPosts(title: string, currentPostId: string, limit: number = 5) {
	try {
		// Pobierz słowa kluczowe z tytułu
		const keywords = title
			.toLowerCase()
			.split(' ')
			.filter(word => word.length > 3)

		if (keywords.length === 0) {
			// Jeśli brak słów kluczowych, zwróć najnowsze artykuły
			return await prisma.post.findMany({
				where: {
					published: true,
					id: { not: currentPostId },
				},
				select: {
					id: true,
					slug: true,
					title: true,
					excerpt: true,
					image: true,
					createdAt: true,
				},
				orderBy: { createdAt: 'desc' },
				take: limit,
			})
		}

		// Szukaj artykułów zawierających podobne słowa
		const relatedPosts = await prisma.post.findMany({
			where: {
				published: true,
				id: { not: currentPostId },
				OR: keywords.map(keyword => ({
					title: {
						contains: keyword,
						mode: 'insensitive' as const,
					},
				})),
			},
			select: {
				id: true,
				slug: true,
				title: true,
				excerpt: true,
				image: true,
				createdAt: true,
			},
			orderBy: { createdAt: 'desc' },
			take: limit,
		})

		return relatedPosts.length > 0
			? relatedPosts
			: // Fallback - jeśli nic nie znaleziono, zwróć najnowsze
			  await prisma.post.findMany({
					where: {
						published: true,
						id: { not: currentPostId },
					},
					select: {
						id: true,
						slug: true,
						title: true,
						excerpt: true,
						image: true,
						createdAt: true,
					},
					orderBy: { createdAt: 'desc' },
					take: limit,
			  })
	} catch (error) {
		console.error('❌ Błąd podczas pobierania powiązanych postów:', error)
		return []
	}
}

/**
 * Generate link report for SEO analysis
 */
export async function generateBacklinkReport(postId: string) {
	try {
		const post = await prisma.post.findUnique({
			where: { id: postId },
			select: {
				title: true,
				content: true,
			},
		})

		if (!post) return null

		// Policz linki w content
		const internalLinkCount = (post.content.match(/href="\/blog\//g) || []).length
		const externalLinkCount = (post.content.match(/href="https?:\/\//g) || []).length

		return {
			postTitle: post.title,
			internalLinks: internalLinkCount,
			externalLinks: externalLinkCount,
			totalLinks: internalLinkCount + externalLinkCount,
			report: `
✅ Internal Links: ${internalLinkCount}
✅ External Links: ${externalLinkCount}
✅ Total Links: ${internalLinkCount + externalLinkCount}
${internalLinkCount >= 2 ? '✅ Good internal linking' : '⚠️ Add more internal links'}
${externalLinkCount >= 1 ? '✅ Has external sources' : '⚠️ Add external sources'}
      `,
		}
	} catch (error) {
		console.error('❌ Błąd podczas generowania raportu:', error)
		return null
	}
}
