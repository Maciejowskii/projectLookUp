'use server'

import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/adminAuth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { injectBacklinks } from '@/lib/backlinks'

// --- GŁÓWNY GENERATOR AI (ULEPSZONA WERSJA) ---
export async function generatePostAI(formData: FormData): Promise<string> {
	const topic = formData.get('topic') as string
	if (!process.env.OPENAI_API_KEY) {
		console.error('BŁĄD: Brak OPENAI_API_KEY w env!')
		throw new Error('Brak klucza AI')
	}

	// ⭐ ULEPSZONE - SEO + 5 sekcji + spis treści z prawdziwymi tytułami + obrazki
	const prompt = `
Jesteś ekspertem SEO i Copywriterem. Napisz obszerny, merytoryczny artykuł blogowy na temat: "${topic}".

WYMAGANIA TREŚCIOWE:
1. Styl: Profesjonalny, doradczy, angażujący dla polskiego czytelnika.
2. Struktura: Dokładnie 5 sekcji (h2), każda z 2-3 akapitami (p). Minimum 3500 znaków łącznie.
3. Formatowanie HTML:
   - Akapity: <p class="mb-6 leading-relaxed text-gray-700">
   - Nagłówki sekcji: <h2 id="section-X" class="text-2xl font-bold mt-10 mb-4 text-gray-900">TYTUŁ SEKCJI</h2> (gdzie X = 0,1,2,3,4)
   - Listy: <ul class="list-disc ml-6 mb-6 text-gray-700"><li class="mb-2">
4. ZAKAZ używania Markdown (gwiazdek **). Używaj <strong> do pogrubienia.
5. Obrazki: Wstaw dokładnie 5 tagów obrazków (po jednym w każdej sekcji):
   <img src="IMAGE_PLACEHOLDER_X" alt="opisowy alt text po polsku" class="w-full h-64 object-cover rounded-2xl my-8 shadow-lg" />
   gdzie X = 1,2,3,4,5

KRYTYCZNE - SPIS TREŚCI:
Na samym początku artykułu (przed pierwszą sekcją) wstaw spis treści z PRAWDZIWYMI tytułami sekcji:
<nav class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl mb-10 border border-blue-100">
  <h3 class="font-bold text-lg mb-4 text-gray-900">Spis treści</h3>
  <ul class="space-y-2">
    <li><a href="#section-0" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">1. [Prawdziwy tytuł sekcji 1]</a></li>
    <li><a href="#section-1" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">2. [Prawdziwy tytuł sekcji 2]</a></li>
    <li><a href="#section-2" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">3. [Prawdziwy tytuł sekcji 3]</a></li>
    <li><a href="#section-3" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">4. [Prawdziwy tytuł sekcji 4]</a></li>
    <li><a href="#section-4" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">5. [Prawdziwy tytuł sekcji 5]</a></li>
  </ul>
</nav>

WAŻNE: Tytuły w spisie treści MUSZĄ być identyczne z tytułami w nagłówkach <h2>!

Struktura JSON odpowiedzi:
{
  "title": "string - tytuł artykułu (max 70 znaków, SEO-friendly)",
  "excerpt": "string - zajawka artykułu (max 160 znaków)",
  "content": "string - pełna treść HTML ze spisem treści i 5 sekcjami",
  "sectionTitles": ["tytuł sekcji 1", "tytuł sekcji 2", "tytuł sekcji 3", "tytuł sekcji 4", "tytuł sekcji 5"],
  "photoQuery": "string - angielski opis do wyszukania zdjęć (np. 'professional electrician working', 'modern kitchen renovation')"
}
`

	try {
		// Wywołanie OpenAI API
		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
			},
			body: JSON.stringify({
				model: 'gpt-4o', // Lepszy model dla dłuższych, bardziej szczegółowych artykułów
				messages: [
					{
						role: 'system',
						content:
							'Jesteś ekspertem SEO i doświadczonym copywriterem. Tworzysz wysokiej jakości artykuły blogowe w języku polskim. Odpowiadasz WYŁĄCZNIE w formacie JSON bez żadnych dodatkowych komentarzy czy wyjaśnień.',
					},
					{
						role: 'user',
						content: prompt,
					},
				],
				temperature: 0.8,
				max_tokens: 8192, // Zwiększony limit dla dłuższych artykułów
				response_format: { type: 'json_object' },
			}),
		})

		if (!response.ok) {
			const errorData = await response.json()
			console.error('BŁĄD OpenAI:', errorData)
			throw new Error(`OpenAI API error: ${response.status}`)
		}

		const openaiResult = await response.json()
		const responseText = openaiResult.choices[0]?.message?.content || ''

		// Wycinanie JSON (na wypadek markdown)
		const firstBrace = responseText.indexOf('{')
		const lastBrace = responseText.lastIndexOf('}')
		const cleanText = responseText.substring(firstBrace, lastBrace + 1)

		let data
		try {
			data = JSON.parse(cleanText)
		} catch (e) {
			console.error('BŁĄD PARSOWANIA JSON. Surowy tekst od AI:', responseText)
			throw new Error('AI zwróciło nieprawidłowy format danych.')
		}

		// Pobierz obrazki z Pexels lub Unsplash
		const searchQuery = data.photoQuery || topic
		let images: string[] = []

		console.log(`🖼️ Szukam obrazków dla: "${searchQuery}"`)

		// Próba 1: Pexels API
		if (process.env.PEXELS_API_KEY) {
			try {
				console.log('📷 Próbuję Pexels API...')
				const res = await fetch(
					`https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=5&orientation=landscape`,
					{ headers: { Authorization: process.env.PEXELS_API_KEY } },
				)
				const pexels = await res.json()
				if (pexels.photos && pexels.photos.length > 0) {
					images = pexels.photos.map((p: any) => p.src.large2x || p.src.large || p.src.medium)
					console.log(`✅ Pexels: znaleziono ${images.length} obrazków`)
				} else {
					console.warn('⚠️ Pexels: brak wyników dla zapytania')
				}
			} catch (imgError) {
				console.error('❌ Błąd Pexels:', imgError)
			}
		} else {
			console.warn('⚠️ Brak PEXELS_API_KEY - obrazki będą z Unsplash')
		}

		// Próba 2: Unsplash (bezpłatne, bez API key)
		if (images.length < 5) {
			console.log('📷 Uzupełniam obrazki z Unsplash...')
			const unsplashQuery = encodeURIComponent(searchQuery.split(' ').slice(0, 3).join(' '))
			const unsplashImages = Array(5 - images.length)
				.fill(0)
				.map((_, i) => `https://source.unsplash.com/1200x630/?${unsplashQuery}&sig=${Date.now() + i}`)
			images = [...images, ...unsplashImages]
			console.log(`✅ Unsplash: dodano ${unsplashImages.length} obrazków`)
		}

		// Fallback na placeholder (ostateczność)
		if (images.length < 5) {
			const placeholderImages = Array(5 - images.length)
				.fill(0)
				.map((_, i) => `https://placehold.co/1200x630/3b82f6/ffffff?text=Katalogo+Blog+${i + 1}`)
			images = [...images, ...placeholderImages]
		}

		const finalImages = images.slice(0, 5)
		console.log(`🎨 Finalne obrazki: ${finalImages.length}`, finalImages)

		let finalContent = data.content

		// Zamień IMAGE_PLACEHOLDER_X na rzeczywiste URLs
		finalImages.forEach((imgUrl, idx) => {
			finalContent = finalContent.replace(`IMAGE_PLACEHOLDER_${idx + 1}`, imgUrl)
		})

		// Cleanup - zamień pozostałe placeholdery
		finalContent = finalContent.replaceAll(/IMAGE_PLACEHOLDER_\d+/g, 'https://placehold.co/1200x630?text=Blog')

		// Markdown cleanup (jeśli AI nie posłuchał)
		finalContent = finalContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')

		// Wygeneruj slug
		const slug =
			data.title
				.toLowerCase()
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/(^-|-$)/g, '') +
			'-' +
			Math.random().toString(36).substring(2, 7)

		// ⭐ NAJPIERW: Zapisz do bazy aby mieć ID
		const post = await prisma.post.create({
			data: {
				title: data.title,
				slug,
				excerpt: data.excerpt,
				content: finalContent,
				published: true,
				image: finalImages[0] || 'https://placehold.co/1200x630?text=Blog',
			},
		})

		// ⭐ DRUGI KROK: Dodaj backlinki
		console.log(`🔗 Dodawanie backlinków do artykułu: ${post.id}`)
		let contentWithBacklinks = finalContent
		try {
			contentWithBacklinks = await injectBacklinks(finalContent, post.id, 3)
		} catch (backlinkerror) {
			console.warn('⚠️ Nie udało się dodać backlinków, ciąg dalej:', backlinkerror)
		}

		// ⭐ TRZECI KROK: Update post z backlinkami
		await prisma.post.update({
			where: { id: post.id },
			data: { content: contentWithBacklinks },
		})

		console.log(`✅ Artykuł gotowy z backlinkami!`)

		revalidatePath('/blog')
		return post.id
	} catch (error: any) {
		console.error('KRYTYCZNY BŁĄD GENERATORA AI:', error.message)
		throw new Error(error.message || 'Wystąpił błąd podczas generowania postu.')
	}
}

// --- AKCJE DLA ADMINA (Z AUTORYZACJĄ) ---

export async function createPost(formData: FormData): Promise<{ error?: string } | void> {
	try {
		await checkAdminAuth()
		const title = (formData.get('title') as string)?.trim()
		const content = (formData.get('content') as string)?.trim()
		const excerpt = (formData.get('excerpt') as string)?.trim()
		const image = (formData.get('image') as string)?.trim()

		if (!title) return { error: 'Tytuł jest wymagany!' }
		if (!content) return { error: 'Treść jest wymagana!' }

		const slug =
			title
				.toLowerCase()
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/-+/g, '-')
				.replace(/(^-|-$)/g, '') +
			'-' +
			Math.random().toString(36).substring(2, 7)

		await prisma.post.create({
			data: { title, slug, content, excerpt: excerpt || null, image: image || null, published: true },
		})

		revalidatePath('/admin/blog')
		revalidatePath('/blog')
	} catch (err: any) {
		console.error('BŁĄD createPost:', err.message)
		return { error: err.message || 'Błąd tworzenia posta' }
	}

	redirect('/admin/blog?success=' + encodeURIComponent('Post został utworzony!'))
}

export async function updatePost(formData: FormData): Promise<{ error?: string; success?: string }> {
	const id = formData.get('id')?.toString()
	if (!id) return { error: 'Brak ID posta!' }

	try {
		await checkAdminAuth()

		const title = formData.get('title')?.toString()?.trim()
		const excerpt = formData.get('excerpt')?.toString()?.trim()
		const content = formData.get('content')?.toString()?.trim()
		const image = formData.get('image')?.toString()?.trim()

		if (!title) return { error: 'Tytuł jest wymagany!' }
		if (!content) return { error: 'Treść jest wymagana!' }

		await prisma.post.update({
			where: { id },
			data: {
				title,
				excerpt: excerpt || null,
				content,
				image: image || null,
			},
		})

		revalidatePath('/admin/blog')
		revalidatePath('/blog')
		return { success: 'Zmiany zostały zapisane!' }
	} catch (err: any) {
		console.error('BŁĄD updatePost:', err.message)
		return { error: err.message || 'Błąd zapisu!' }
	}
}

export async function deletePost(id: string) {
	await checkAdminAuth()
	await prisma.post.delete({ where: { id } })
	revalidatePath('/admin/blog')
	revalidatePath('/blog')
}

export async function generatePostAIForm(formData: FormData) {
	await checkAdminAuth()

	if (!process.env.OPENAI_API_KEY) {
		console.error('❌ BRAK OPENAI_API_KEY w zmiennych środowiskowych!')
		redirect('/admin/blog?error=' + encodeURIComponent('Brak klucza OPENAI_API_KEY w zmiennych środowiskowych!'))
	}

	let success = false
	try {
		await generatePostAI(formData)
		revalidatePath('/admin/blog')
		revalidatePath('/blog')
		success = true
	} catch (error: any) {
		console.error('❌ BŁĄD generowania posta AI:', error.message)
		redirect('/admin/blog?error=' + encodeURIComponent(error.message || 'Wystąpił błąd podczas generowania posta'))
	}

	if (success) {
		redirect('/admin/blog?success=' + encodeURIComponent('Post został wygenerowany!'))
	}
}

// --- SYSTEM PLANOWANIA ---

export async function schedulePost(formData: FormData) {
	await checkAdminAuth()
	const topic = formData.get('topic')?.toString()
	const date = formData.get('date')?.toString()
	const time = formData.get('time')?.toString() || '08:00'

	if (!topic || !date) return

	// Tworzymy datę w lokalnej strefie czasowej (Poland = UTC+1/+2)
	const scheduledAt = new Date(`${date}T${time}:00`)

	console.log(`📅 Planowanie posta: "${topic}" na ${scheduledAt.toISOString()}`)

	await prisma.scheduledPost.create({
		data: { topic, scheduledAt, status: 'scheduled' },
	})
	revalidatePath('/admin/blog')
}

// Ręczne uruchomienie CRON-a z panelu admina (bez wymagania CRON_SECRET)
export async function runScheduledPostsManually() {
	await checkAdminAuth()

	const jobsToRun = await prisma.scheduledPost.findMany({
		where: {
			status: 'scheduled',
			scheduledAt: { lte: new Date() },
		},
	})

	console.log(`🔄 Ręczne uruchomienie CRON: ${jobsToRun.length} postów do przetworzenia`)

	for (const job of jobsToRun) {
		try {
			await processPostExecution(job.id)
		} catch (e) {
			console.error(`Błąd przetwarzania ${job.id}:`, e)
		}
	}

	revalidatePath('/admin/blog')
	revalidatePath('/blog')
}

export async function processPostExecution(jobId: string) {
	const job = await prisma.scheduledPost.findUnique({ where: { id: jobId } })
	if (!job || job.status !== 'scheduled') return

	await prisma.scheduledPost.update({ where: { id: jobId }, data: { status: 'processing' } })

	try {
		const fd = new FormData()
		fd.set('topic', job.topic)
		const postId = await generatePostAI(fd)
		await prisma.scheduledPost.update({
			where: { id: jobId },
			data: { status: 'done', executedAt: new Date(), postId },
		})
	} catch (error: any) {
		console.error(`Błąd automatu (${jobId}):`, error.message)
		await prisma.scheduledPost.update({ where: { id: jobId }, data: { status: 'failed' } })
	}
}

export async function publishScheduledPost(formData: FormData) {
	await checkAdminAuth()
	const id = formData.get('id')?.toString()
	if (!id) return
	await processPostExecution(id)
	revalidatePath('/admin/blog')
}

export async function cancelScheduledPost(formData: FormData) {
	await checkAdminAuth()
	const id = formData.get('id')?.toString()
	if (!id) return
	await prisma.scheduledPost.update({ where: { id }, data: { status: 'cancelled' } })
	revalidatePath('/admin/blog')
}

/** Godziny publikacji w ciągu dnia (3 sloty). */
const BULK_SCHEDULE_HOURS = [8, 12, 18]

/**
 * Dodaje masowo tematy do planera: N tematów planowanych na kolejne dni
 * o 8:00, 12:00, 18:00 (3 wpisy dziennie). Start od jutra.
 */
export async function scheduleBulkTopics(formData: FormData) {
	await checkAdminAuth()

	const topicsText = (formData.get('topics') as string)?.trim() || ''
	const countStr = (formData.get('count') as string)?.trim() || ''

	let topics: string[] = []
	if (topicsText) {
		topics = topicsText
			.split(/\r?\n/)
			.map(s => s.trim())
			.filter(Boolean)
	} else if (countStr) {
		const n = parseInt(countStr, 10)
		if (isNaN(n) || n < 1 || n > 500) {
			redirect('/admin/blog?error=' + encodeURIComponent('Liczba tematów musi być od 1 do 500.'))
		}
		topics = Array.from({ length: n }, (_, i) => `Temat ${i + 1}`)
	}

	if (topics.length === 0) {
		redirect(
			'/admin/blog?error=' + encodeURIComponent('Wpisz liczbę tematów LUB wklej listę tematów (jeden per linia).'),
		)
	}

	// Start od jutra, północ (lokalna strefa)
	const start = new Date()
	start.setDate(start.getDate() + 1)
	start.setHours(0, 0, 0, 0)

	const data = topics.map((topic, i) => {
		const dayOffset = Math.floor(i / BULK_SCHEDULE_HOURS.length)
		const hourIndex = i % BULK_SCHEDULE_HOURS.length
		const scheduledAt = new Date(start)
		scheduledAt.setDate(start.getDate() + dayOffset)
		scheduledAt.setHours(BULK_SCHEDULE_HOURS[hourIndex], 0, 0, 0)
		return { topic, scheduledAt, status: 'scheduled' as const }
	})

	await prisma.scheduledPost.createMany({ data })
	revalidatePath('/admin/blog')
	redirect(
		'/admin/blog?success=' +
			encodeURIComponent(
				`Zaplanowano ${topics.length} tematów (8:00, 12:00, 18:00 przez ${Math.ceil(topics.length / 3)} dni).`,
			),
	)
}
