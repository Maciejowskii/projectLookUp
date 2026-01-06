'use server'

import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/adminAuth'
import { revalidatePath } from 'next/cache'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { toast } from 'react-hot-toast'

interface FormState {
	message?: string
}
// Inicjalizacja klienta Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '')

async function fetchPexelsImage(query: string): Promise<string | null> {
	if (!process.env.PEXELS_API_KEY) return null

	try {
		const res = await fetch(`https://api.pexels.com/v1/search?query=${query}&per_page=1&locale=pl-PL`, {
			headers: {
				Authorization: process.env.PEXELS_API_KEY,
			},
		})
		const data = await res.json()
		if (data.photos && data.photos.length > 0) {
			return data.photos[0].src.landscape
		}
	} catch (e) {
		console.error('Pexels error:', e)
	}
	return null
}

export async function createPost(formData: FormData) {
	await checkAdminAuth()

	const title = formData.get('title') as string
	const content = formData.get('content') as string
	const excerpt = formData.get('excerpt') as string
	const image = formData.get('image') as string

	// Slugify
	const slug = title
		.toLowerCase()
		.replace(/ł/g, 'l')
		.replace(/ś/g, 's')
		.replace(/ć/g, 'c')
		.replace(/ą/g, 'a')
		.replace(/ę/g, 'e')
		.replace(/ń/g, 'n')
		.replace(/ź/g, 'z')
		.replace(/ż/g, 'z')
		.replace(/ó/g, 'o')
		.replace(/[^a-z0-9]/g, '-')
		.replace(/-+/g, '-')

	const post = await prisma.post.create({
		data: {
			title,
			slug,
			content,
			excerpt,
			image,
			published: true,
		},
	})

	revalidatePath('/admin/blog')
	revalidatePath('/blog')
	// ✅ NIE ZWRACA NIC - dla formularza
}

export async function deletePost(id: string) {
	await checkAdminAuth()
	await prisma.post.delete({ where: { id } })
	revalidatePath('/admin/blog')
	revalidatePath('/blog')
}

// --- GENERATOR AI DLA CRON (ZWRACA ID) ---
export async function generatePostAI(formData: FormData): Promise<string> {
	await checkAdminAuth()
	const topic = formData.get('topic') as string

	if (!process.env.GOOGLE_AI_KEY) throw new Error('Brak klucza GOOGLE_AI_KEY')

	const model = genAI.getGenerativeModel({
		model: 'gemini-2.5-flash', // Upewnij się, że model jest poprawny (zwykle gemini-1.5-flash)
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
			// Używamy 'large' zamiast 'medium' dla lepszej jakości
			if (pexels.photos) images = pexels.photos.map((p: any) => p.src.large)
		}

		const mainImage = images[0] || 'https://placehold.co/1200x630?text=Katalogo+News'
		let finalContent = data.content

		// Podmiana placeholderów na wysokiej jakości zdjęcia z klasami Tailwind
		images.slice(1).forEach((imgUrl, i) => {
			finalContent = finalContent.replace(
				'src="IMAGE_PLACEHOLDER"',
				`src="${imgUrl}" alt="${data.title} - foto ${
					i + 1
				}" class="w-full aspect-video rounded-3xl my-10 object-cover shadow-lg border border-gray-100"`
			)
		})

		// Fallback dla brakujących placeholderów
		finalContent = finalContent.replaceAll(
			'src="IMAGE_PLACEHOLDER"',
			`src="${mainImage}" class="w-full rounded-3xl my-10"`
		)

		const slug =
			data.title
				.toLowerCase()
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '') // usuwanie polskich znaków
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
		console.error('Błąd generowania postu:', error)
		throw error
	}
}

// --- DLA FORMULARZA (NIE ZWRACA NIC) ---
export async function generatePostAIForm(formData: FormData) {
	await generatePostAI(formData) // wywołuje główną funkcję
	revalidatePath('/admin/blog')
}

export async function schedulePost(formData: FormData) {
	const topic = formData.get('topic')?.toString()
	const date = formData.get('date')?.toString()
	const time = formData.get('time')?.toString() || '08:00'

	if (!topic || !date) return

	const scheduledAt = new Date(`${date}T${time}`) // ✅ DATA + GODZINA!

	await prisma.scheduledPost.create({
		data: {
			topic,
			scheduledAt,
			status: 'scheduled', // ✅ Domyślny status
		},
	})

	revalidatePath('/admin/blog')
}

export async function updatePost(_prevState: FormState, formData: FormData): Promise<FormState> {
	const id = formData.get('id')?.toString()
	const title = formData.get('title')?.toString() ?? ''
	const excerpt = formData.get('excerpt')?.toString() ?? ''
	const content = formData.get('content')?.toString() ?? ''

	if (!id) {
		return { message: '❌ Brak ID posta!' }
	}

	await prisma.post.update({
		where: { id },
		data: { title, excerpt, content },
	})

	revalidatePath('/admin/blog')
	revalidatePath('/blog')

	return { message: '✅ Zmiany zapisane pomyślnie!' }
}

// DODAJ te 2 funkcje:
export async function publishScheduledPost(formData: FormData) {
	const id = formData.get('id')?.toString()
	if (!id) return

	const job = await prisma.scheduledPost.findUnique({ where: { id } })
	if (!job) return

	await prisma.scheduledPost.update({
		where: { id },
		data: { status: 'processing' },
	})

	const formDataAI = new FormData()
	formDataAI.set('topic', job.topic)
	const postId = await generatePostAI(formDataAI)

	await prisma.scheduledPost.update({
		where: { id },
		data: { status: 'done', executedAt: new Date(), postId },
	})

	revalidatePath('/admin/blog')
}

export async function cancelScheduledPost(formData: FormData) {
	const id = formData.get('id')?.toString()
	if (!id) return

	await prisma.scheduledPost.update({
		where: { id },
		data: { status: 'cancelled' },
	})
	revalidatePath('/admin/blog')
}
