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
// Funkcja wyabstrahowana, aby mogła być wywoływana przez Cron (bez auth)
// oraz przez formularze (z auth).
export async function generatePostAI(formData: FormData): Promise<string> {
	const topic = formData.get('topic') as string
	if (!process.env.GOOGLE_AI_KEY) throw new Error('Brak klucza GOOGLE_AI_KEY')

	const model = genAI.getGenerativeModel({
		model: 'gemini-1.5-flash', // Najszybszy i najbardziej stabilny dla długich tekstów
		generationConfig: { responseMimeType: 'application/json' },
	})

	const prompt = `
    Jesteś ekspertem SEO i Copywriterem. Napisz obszerny, merytoryczny artykuł blogowy na temat: "${topic}".
    
    WYMAGANIA TREŚCIOWE:
    1. Styl: Profesjonalny, doradczy, angażujący.
    2. Struktura HTML: Minimum 4 sekcje <h2>. Każda sekcja musi mieć 2-3 akapity <p>. Używaj <ul> i <li> dla list.
    3. Formatowanie: Każdy akapit tekstu musi być otoczony tagiem <p>. Nie używaj podwójnych enterów, tylko czysty HTML.
    4. Długość: Minimum 2000 znaków.
    5. Zdjęcia: Wstaw tag <img src="IMAGE_PLACEHOLDER" alt="opis" /> dokładnie w połowie tekstu oraz na końcu.

    Struktura HTML: 
      - Każdy akapit tekstu MUSI być w tagu <p class="mb-6 leading-relaxed">.
      - Nagłówki sekcji MUSI być w tagu <h2 class="text-2xl font-bold mt-10 mb-4">.
      - Listy w tagach <ul class="list-disc ml-6 mb-6"> i <li class="mb-2">.
    
    STRUKTURA JSON (zwróć tylko to):
    {
      "title": "Chwytliwy tytuł SEO",
      "excerpt": "Krótki wstęp zachęcający do kliknięcia (max 160 znaków).",
      "content": "Pełna treść w HTML (używaj <p>, <h2>, <ul>, <li>)",
      "photoQuery": "Konkretny, opisowy angielski termin do wyszukiwarki zdjęć (np. 'modern living room interior design')"
    }
  `

	try {
		const result = await model.generateContent(prompt)
		const data = JSON.parse(result.response.text())

		let images: string[] = []
		if (process.env.PEXELS_API_KEY) {
			const res = await fetch(
				`https://api.pexels.com/v1/search?query=${encodeURIComponent(
					data.photoQuery
				)}&per_page=3&orientation=landscape`,
				{ headers: { Authorization: process.env.PEXELS_API_KEY } }
			)
			const pexels = await res.json()
			if (pexels.photos) images = pexels.photos.map((p: any) => p.src.large)
		}

		const mainImage = images[0] || 'https://placehold.co/1200x630?text=Katalogo+News'
		let finalContent = data.content

		// Wstawianie zdjęć w miejsca placeholderów
		images.slice(1).forEach((imgUrl, i) => {
			finalContent = finalContent.replace(
				'src="IMAGE_PLACEHOLDER"',
				`src="${imgUrl}" alt="${data.title} - foto ${
					i + 1
				}" class="w-full aspect-video rounded-3xl my-10 object-cover shadow-lg border border-gray-100"`
			)
		})

		// Fallback dla pozostałych tagów img
		finalContent = finalContent.replaceAll(
			'src="IMAGE_PLACEHOLDER"',
			`src="${mainImage}" class="w-full rounded-3xl my-10"`
		)

		// Bezpieczny slug bez polskich znaków
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
		console.error('Błąd generatora AI:', error)
		throw error
	}
}

// --- AKCJE DLA ADMINA (Z AUTORYZACJĄ) ---

export async function createPost(formData: FormData) {
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
}

export async function updatePost(_prevState: FormState, formData: FormData): Promise<FormState> {
	const id = formData.get('id')?.toString()
	if (!id) return { message: '❌ Brak ID posta!' }

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
}

export async function deletePost(id: string) {
	await checkAdminAuth()
	await prisma.post.delete({ where: { id } })
	revalidatePath('/admin/blog')
	revalidatePath('/blog')
}

export async function generatePostAIForm(formData: FormData) {
	await checkAdminAuth() // Sprawdzamy uprawnienia przed uruchomieniem Gemini
	await generatePostAI(formData)
	revalidatePath('/admin/blog')
}

// --- SYSTEM PLANOWANIA (SCHEDULING) ---

export async function schedulePost(formData: FormData) {
	await checkAdminAuth()
	const topic = formData.get('topic')?.toString()
	const date = formData.get('date')?.toString()
	const time = formData.get('time')?.toString() || '08:00'

	if (!topic || !date) return

	await prisma.scheduledPost.create({
		data: {
			topic,
			scheduledAt: new Date(`${date}T${time}`),
			status: 'scheduled',
		},
	})

	revalidatePath('/admin/blog')
}

export async function processPostExecution(jobId: string) {
	// Funkcja bez checkAdminAuth, wywoływana przez Cron lub akcję admina
	const job = await prisma.scheduledPost.findUnique({ where: { id: jobId } })
	if (!job || job.status !== 'scheduled') return

	await prisma.scheduledPost.update({
		where: { id: jobId },
		data: { status: 'processing' },
	})

	try {
		const fd = new FormData()
		fd.set('topic', job.topic)
		const postId = await generatePostAI(fd)

		await prisma.scheduledPost.update({
			where: { id: jobId },
			data: { status: 'done', executedAt: new Date(), postId },
		})
	} catch (error) {
		console.error(`Błąd automatu (${jobId}):`, error)
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
