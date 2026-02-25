export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { ArrowRight, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

export const metadata = {
	title: 'Blog i Porady | katalogo',
	description: 'Najnowsze artykuły, porady i rankingi firm.',
	robots: {
		index: true,
		follow: true,
	},
	alternates: {
		canonical: '/blog',
	},
}

const POSTS_PER_PAGE = 12

export default async function BlogIndexPage({
	searchParams,
}: {
	searchParams: Promise<{ page?: string }>
}) {
	const params = await searchParams
	const currentPage = Math.max(1, parseInt(params.page || '1', 10))
	const skip = (currentPage - 1) * POSTS_PER_PAGE

	// Pobierz posty i całkowitą liczbę
	const [posts, totalPosts] = await Promise.all([
		prisma.post.findMany({
			where: { published: true },
			orderBy: { createdAt: 'desc' },
			take: POSTS_PER_PAGE,
			skip: skip,
			select: {
				id: true,
				title: true,
				slug: true,
				excerpt: true,
				image: true,
				content: true,
				createdAt: true,
			},
		}),
		prisma.post.count({
			where: { published: true },
		}),
	])

	// Funkcja do wyciągnięcia pierwszego obrazka z HTML content
	const getFirstImageFromContent = (content: string): string | null => {
		if (!content) return null
		// Szukaj pierwszego <img> tagu
		const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)
		if (imgMatch && imgMatch[1]) {
			return imgMatch[1]
		}
		// Szukaj obrazków w różnych formatach
		const imgMatch2 = content.match(/src=["']([^"']+\.(jpg|jpeg|png|gif|webp|svg))["']/i)
		if (imgMatch2 && imgMatch2[1]) {
			return imgMatch2[1]
		}
		return null
	}

	// Dodaj obrazek do każdego posta (z pola image lub z content)
	const postsWithImages = posts.map((post) => {
		const imageFromContent = getFirstImageFromContent(post.content || '')
		return {
			...post,
			displayImage: post.image || imageFromContent || null,
		}
	})

	const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE)

	return (
		<div className='min-h-screen bg-gray-50 font-sans flex flex-col'>
			<Navbar />

			<main className='flex-grow container mx-auto px-4 pt-32 pb-20 max-w-6xl'>
				<div className='text-center mb-16'>
					<h1 className='text-4xl font-extrabold text-gray-900 mb-4'>Blog i Porady</h1>
					<p className='text-xl text-gray-500'>Wiedza, która pomoże Ci wybrać najlepszych fachowców.</p>
				</div>

				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
					{postsWithImages.map((post) => (
						<Link
							key={post.id}
							href={`/blog/${post.slug}`}
							className='group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col'
						>
							<div className='h-56 bg-gray-200 relative overflow-hidden'>
								{post.displayImage ? (
									<Image
										src={post.displayImage}
										alt={post.title}
										fill
										className='object-cover group-hover:scale-105 transition-transform duration-500'
										sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
									/>
								) : (
									<div className='w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-3xl opacity-90'>
										{post.title.charAt(0)}
									</div>
								)}
							</div>
							<div className='p-8 flex flex-col flex-grow'>
								<div className='flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-wider mb-3'>
									<Calendar size={14} />
									{new Date(post.createdAt).toLocaleDateString('pl-PL')}
								</div>
								<h2 className='text-xl font-bold text-gray-900 mb-3 leading-tight group-hover:text-blue-600 transition-colors'>
									{post.title}
								</h2>
								<p className='text-gray-500 text-sm line-clamp-3 mb-6 flex-grow'>{post.excerpt}</p>
								<div className='flex items-center text-blue-600 font-bold text-sm gap-2 mt-auto'>
									Czytaj dalej <ArrowRight size={16} className='group-hover:translate-x-1 transition-transform' />
								</div>
							</div>
						</Link>
					))}
				</div>

				{postsWithImages.length === 0 && (
					<div className='text-center py-20 text-gray-400'>Jeszcze nie ma żadnych wpisów. Wróć wkrótce!</div>
				)}

				{/* Paginacja */}
				{totalPages > 1 && (
					<div className='mt-16 flex flex-col sm:flex-row items-center justify-between gap-4'>
						{/* Info o stronie */}
						<p className='text-sm text-gray-500'>
							Strona {currentPage} z {totalPages} • {totalPosts} {totalPosts === 1 ? 'wpis' : totalPosts < 5 ? 'wpisy' : 'wpisów'}
						</p>

						{/* Przyciski paginacji */}
						<div className='flex items-center gap-2'>
							{/* Poprzednia strona */}
							{currentPage > 1 ? (
								<Link
									href={`/blog${currentPage === 2 ? '' : `?page=${currentPage - 1}`}`}
									className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors'
								>
									<ChevronLeft size={16} />
									Poprzednia
								</Link>
							) : (
								<span className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed'>
									<ChevronLeft size={16} />
									Poprzednia
								</span>
							)}

							{/* Numery stron */}
							<div className='flex items-center gap-1'>
								{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
									let pageNum: number
									if (totalPages <= 5) {
										pageNum = i + 1
									} else if (currentPage <= 3) {
										pageNum = i + 1
									} else if (currentPage >= totalPages - 2) {
										pageNum = totalPages - 4 + i
									} else {
										pageNum = currentPage - 2 + i
									}

									return (
										<Link
											key={pageNum}
											href={`/blog${pageNum === 1 ? '' : `?page=${pageNum}`}`}
											className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
												pageNum === currentPage
													? 'bg-blue-600 text-white'
													: 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
											}`}
										>
											{pageNum}
										</Link>
									)
								})}
							</div>

							{/* Następna strona */}
							{currentPage < totalPages ? (
								<Link
									href={`/blog?page=${currentPage + 1}`}
									className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors'
								>
									Następna
									<ChevronRight size={16} />
								</Link>
							) : (
								<span className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed'>
									Następna
									<ChevronRight size={16} />
								</span>
							)}
						</div>
					</div>
				)}
			</main>

			<Footer />
		</div>
	)
}
