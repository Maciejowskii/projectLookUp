'use server'

import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/adminAuth'
import { revalidatePath } from 'next/cache'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface FormState {
	message?: string
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

// --- GŁÓWNY GENERATOR AI (SILNIK) ---
export async function generatePostAI(formData: FormData): Promise<string> {
	const topic = formData.get('topic') as string
	if (!process.env.GOOGLE_AI_KEY) {
		console.error('BŁĄD: Brak GOOGLE_AI_KEY w env!')
		throw new Error('Brak klucza AI')
	}

	const model = genAI.getGenerativeModel({
		model: 'gemini-2.5-flash',
		generationConfig: { responseMimeType: 'application/json' },
	})

	// TWÓJ PROMPT (BEZ ZMIAN)
	const prompt = `
    Jesteś ekspertem SEO i Copywriterem. Napisz obszerny, merytoryczny artykuł blogowy na temat: "${topic}".
   
    WYMAGANIA TREŚCIOWE:
    1. Styl: Profesjonalny, doradczy, angażujący.
    2. Struktura HTML: Minimum 4 sekcje <h2>. Każda sekcja musi mieć 2-3 akapity <p>. Używaj <ul> i <li> dla list.
    3. Formatowanie: Każdy akapit tekstu musi być otoczony tagiem <p>. Nie używaj podwójnych enterów, tylko czysty HTML.
    4. Długość: Minimum 2000 znaków.
    5. Zdjęcia: Wstaw tag <img src="IMAGE_PLACE_HOLDER" alt="opis" /> dokładnie w połowie tekstu oraz na końcu.
    6. Zakaz Markdown: Absolutnie nie używaj gwiazdek (np. **tekst**) do pogrubiania. Zamiast tego używaj tagu <strong>tekst</strong>. 
    7. Formatowanie list: Elementy listy <li> nie mogą zawierać gwiazdek na początku. Jeśli chcesz coś wyróżnić wewnątrz <li>, użyj <strong>.

    Struktura HTML:
      - Każdy akapit tekstu MUSI być w tagu <p class="mb-6 leading-relaxed">.
      - Nagłówki sekcji MUSI być w tagu <h2 class="text-2xl font-bold mt-10 mb-4">.
      - Listy w tagach <ul class="list-disc ml-6 mb-6"> i <li class="mb-2">.
   
    STRUKTURA JSON (zwróć tylko to):
    {
      "title": "string",
      "excerpt": "string",
      "content": "string",
      "photoQuery": "Konkretny angielski opis zdjęcia przedstawiającego ludzi przy pracy lub realne przedmioty (np. 'cleaning service professional at work', 'plumber repairing kitchen sink'). Unikaj pojęć abstrakcyjnych i symbolicznych."
    }
  `

	try {
		const result = await model.generateContent(prompt)
		const responseText = result.response.text()

		// Bardziej odporne wycinanie JSON (na wypadek gdyby AI dodało markdown)
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

		const searchQuery = `${data.photoQuery} service professional`

		let images: string[] = []
		if (process.env.PEXELS_API_KEY) {
			try {
				const res = await fetch(
					`https://api.pexels.com/v1/search?query=${encodeURIComponent(
						searchQuery
					)}&per_page=3&orientation=landscape&size=large`,
					{ headers: { Authorization: process.env.PEXELS_API_KEY } }
				)
				const pexels = await res.json()
				if (pexels.photos) images = pexels.photos.map((p: any) => p.src.large)
			} catch (imgError) {
				console.error('Błąd Pexels:', imgError)
			}
		}

		const mainImage = images[0] || 'https://placehold.co/1200x630?text=Katalogo+News'
		let finalContent = data.content

		// Zamień ewentualne pozostałości Markdown na HTML
		finalContent = finalContent
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // zamienia **tekst** na <strong>tekst</strong>
			.replace(/\*(.*?)\*/g, '<em>$1</em>') // zamienia *tekst* na <em>tekst</em>

		images.slice(1).forEach((imgUrl, i) => {
			finalContent = finalContent.replace(
				'src="IMAGE_PLACE_HOLDER"',
				`src="${imgUrl}" alt="${data.title} - foto ${
					i + 1
				}" class="w-full aspect-video rounded-3xl my-10 object-cover shadow-lg border border-gray-100"`
			)
		})

		finalContent = finalContent.replaceAll(
			'src="IMAGE_PLACE_HOLDER"',
			`src="${mainImage}" class="w-full rounded-3xl my-10"`
		)

		const slug =
			data.title
				.toLowerCase()
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/(^-|-$)/g, '') +
			'-' +
			Math.random().toString(36).substring(2, 7)

		const post = await prisma.post.create({
			data: {
				title: data.title,
				slug,
				excerpt: data.excerpt,
				content: finalContent,
				published: true,
				image: mainImage,
			},
		})

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
	await generatePostAI(formData)
	revalidatePath('/admin/blog')
}

// --- SYSTEM PLANOWANIA ---

export async function schedulePost(formData: FormData) {
	await checkAdminAuth()
	const topic = formData.get('topic')?.toString()
	const date = formData.get('date')?.toString()
	const time = formData.get('time')?.toString() || '08:00'

	if (!topic || !date) return

	await prisma.scheduledPost.create({
		data: { topic, scheduledAt: new Date(`${date}T${time}`), status: 'scheduled' },
	})
	revalidatePath('/admin/blog')
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
