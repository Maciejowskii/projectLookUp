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
			take: limit * 2, // Pobierz więcej, żeby miał z czego wybrać
		})

		if (otherPosts.length === 0) return content

		// Losowo wybiór artykułów
		const selectedPosts = otherPosts.sort(() => Math.random() - 0.5).slice(0, Math.min(limit, 3))

		let updatedContent = content
		let linksAdded = 0

		// Szukaj sekcji i wstaw linki
		selectedPosts.forEach((post, idx) => {
			// Ustaw pozycję linku na podstawie sekcji
			let targetSection = `<section id="section-${idx + 1}">`

			if (updatedContent.includes(targetSection)) {
				// Znajdź ostatni <p> w sekcji i dodaj link do niego
				const sectionStart = updatedContent.indexOf(targetSection)
				const nextSection = updatedContent.indexOf(`<section id="section-${idx + 2}">`, sectionStart)
				const sectionEnd = nextSection !== -1 ? nextSection : updatedContent.length

				const sectionContent = updatedContent.substring(sectionStart, sectionEnd)
				const lastPIndex = sectionContent.lastIndexOf('</p>')

				if (lastPIndex !== -1) {
					const insertPos = sectionStart + lastPIndex

					const backlink = `<a href="/blog/${post.slug}" class="text-blue-600 hover:underline font-semibold">${post.title}</a>`
					const contextLink = ` Więcej informacji na ten temat znajdziesz w artykule "${backlink}".`

					updatedContent = updatedContent.substring(0, insertPos) + contextLink + updatedContent.substring(insertPos)

					linksAdded++
				}
			}
		})

		console.log(`✅ Dodano ${linksAdded} backlinków`)
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
