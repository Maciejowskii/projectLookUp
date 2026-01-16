'use server'

import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/adminAuth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { injectBacklinks } from '@/lib/backlinks'

interface FormState {
	message?: string
}

// --- GŁÓWNY GENERATOR AI (ULEPSZONA WERSJA) ---
export async function generatePostAI(formData: FormData): Promise<string> {
	const topic = formData.get('topic') as string
	if (!process.env.OPENAI_API_KEY) {
		console.error('BŁĄD: Brak OPENAI_API_KEY w env!')
		throw new Error('Brak klucza AI')
	}

	// ⭐ ULEPSZONE - SEO + 5 sekcji + spis treści + wiele obrazków
	const prompt = `
    Jesteś ekspertem SEO i Copywriterem. Napisz obszerny, merytoryczny artykuł blogowy na temat: "${topic}".
   
    WYMAGANIA TREŚCIOWE:
    1. Styl: Profesjonalny, doradczy, angażujący.
    2. Struktura: Dokładnie 5 sekcji (h2), każda z 2-3 akapitami (p). Minimum 3500 znaków.
    3. Formatowanie: Każdy akapit w <p class="mb-6 leading-relaxed">. Nagłówki w <h2 class="text-2xl font-bold mt-10 mb-4">. Listy w <ul class="list-disc ml-6 mb-6"><li class="mb-2">
    4. Zakaz Markdown: Absolutnie nie używaj gwiazdek (**tekst**). Używaj <strong>tekst</strong> do pogrubienia.
    5. Obrazki: Wstaw dokładnie 5 tagów: <img src="IMAGE_PLACEHOLDER_1" alt="opis" class="w-full rounded-3xl my-10 object-cover shadow-lg" />
    6. Spis Treści: Na POCZĄTKU artykułu, przed wszystkim, wstaw:
       <nav class="bg-gray-50 p-6 rounded-lg mb-10 border border-gray-200">
         <h3 class="font-bold mb-4">📋 Spis Treści</h3>
         <ul class="space-y-2">
           <li><a href="#section-0" class="text-blue-600 hover:underline">Sekcja 1</a></li>
           <li><a href="#section-1" class="text-blue-600 hover:underline">Sekcja 2</a></li>
           <li><a href="#section-2" class="text-blue-600 hover:underline">Sekcja 3</a></li>
           <li><a href="#section-3" class="text-blue-600 hover:underline">Sekcja 4</a></li>
           <li><a href="#section-4" class="text-blue-600 hover:underline">Sekcja 5</a></li>
         </ul>
       </nav>
    7. Sekcje: Każdą sekcję opakuj w <section id="section-X"> gdzie X=0,1,2,3,4

    Struktura JSON:
    {
      "title": "string (max 70 znaków dla SEO)",
      "excerpt": "string (max 160 znaków)",
      "content": "string (spis treści + 5 sekcji z obrazkami)",
      "photoQuery": "Konkretny angielski opis dla zdjęcia (np. 'professional plumber at work', 'cleaning service expert')"
    }
  `

	try {
		// Wywołanie OpenAI API
		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
			},
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				messages: [
					{
						role: 'system',
						content: 'Jesteś ekspertem SEO i copywriterem. Odpowiadasz TYLKO w formacie JSON bez żadnych dodatkowych komentarzy.',
					},
					{
						role: 'user',
						content: prompt,
					},
				],
				temperature: 0.7,
				max_tokens: 4096,
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

		// Pobierz obrazki z Pexels
		const searchQuery = `${data.photoQuery} service professional`
		let images: string[] = []

		if (process.env.PEXELS_API_KEY) {
			try {
				const res = await fetch(
					`https://api.pexels.com/v1/search?query=${encodeURIComponent(
						searchQuery
					)}&per_page=5&orientation=landscape&size=large`,
					{ headers: { Authorization: process.env.PEXELS_API_KEY } }
				)
				const pexels = await res.json()
				if (pexels.photos) images = pexels.photos.map((p: any) => p.src.large)
			} catch (imgError) {
				console.warn('⚠️ Błąd Pexels - będzie używany placeholder:', imgError)
			}
		}

		// Fallback na placeholder
		const placeholderImages = Array(5)
			.fill(0)
			.map((_, i) => `https://placehold.co/1200x630?text=Katalogo+${i + 1}`)
		const finalImages = [...images, ...placeholderImages].slice(0, 5)

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

export async function createPost(formData: FormData) {
	try {
		await checkAdminAuth()
		const title = formData.get('title') as string
		const content = formData.get('content') as string
		const excerpt = formData.get('excerpt') as string
		const image = formData.get('image') as string

		const slug = title
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/-+/g, '-')

		await prisma.post.create({
			data: { title, slug, content, excerpt, image, published: true },
		})

		revalidatePath('/admin/blog')
		revalidatePath('/blog')
	} catch (err: any) {
		console.error('BŁĄD createPost:', err.message)
		throw err
	}
}

export async function updatePost(_prevState: FormState, formData: FormData): Promise<FormState> {
	const id = formData.get('id')?.toString()
	if (!id) return { message: '❌ Brak ID posta!' }

	try {
		await prisma.post.update({
			where: { id },
			data: {
				title: formData.get('title')?.toString() ?? '',
				excerpt: formData.get('excerpt')?.toString() ?? '',
				content: formData.get('content')?.toString() ?? '',
			},
		})
		revalidatePath('/admin/blog')
		revalidatePath('/blog')
		return { message: '✅ Zmiany zapisane!' }
	} catch (err: any) {
		console.error('BŁĄD updatePost:', err.message)
		return { message: '❌ Błąd zapisu!' }
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
	
	// Sprawdź klucz API przed próbą generowania
	if (!process.env.OPENAI_API_KEY) {
		console.error('❌ BRAK OPENAI_API_KEY w zmiennych środowiskowych!')
		redirect('/admin/blog?error=' + encodeURIComponent('Brak klucza OPENAI_API_KEY w zmiennych środowiskowych!'))
	}
	
	try {
		await generatePostAI(formData)
		revalidatePath('/admin/blog')
		revalidatePath('/blog')
		redirect('/admin/blog?success=' + encodeURIComponent('Post został wygenerowany!'))
	} catch (error: any) {
		console.error('❌ BŁĄD generowania posta AI:', error.message)
		redirect('/admin/blog?error=' + encodeURIComponent(error.message || 'Wystąpił błąd podczas generowania posta'))
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
