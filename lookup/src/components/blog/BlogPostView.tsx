'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface RecommendedBlog {
	id: string
	slug: string
	title: string
	excerpt: string
	image?: string
	createdAt: string
}

interface BlogPostViewProps {
	post: {
		title: string
		excerpt: string
		content: string
		createdAt: string
		image?: string
	}
	postId: string
}

export default function BlogPostView({ post, postId }: BlogPostViewProps) {
	const [recommendedBlogs, setRecommendedBlogs] = useState<RecommendedBlog[]>([])
	const [loading, setLoading] = useState(true)
	const [activeSection, setActiveSection] = useState<string>('')

	// Pobierz polecane blogi
	useEffect(() => {
		const fetchRecommendedBlogs = async () => {
			try {
				const response = await fetch(`/api/blog/recommended?excludePostId=${postId}&limit=6`)
				if (!response.ok) throw new Error('Failed to fetch')
				const data = await response.json()
				setRecommendedBlogs(data || [])
			} catch (error) {
				console.error('Błąd pobierania polecanych blogów:', error)
				setRecommendedBlogs([])
			} finally {
				setLoading(false)
			}
		}

		fetchRecommendedBlogs()
	}, [postId])

	// Scroll Spy - aktualizuj aktywny link w TOC
	useEffect(() => {
		const handleScroll = () => {
			const sections = document.querySelectorAll('section[id^="section-"]')

			sections.forEach(section => {
				const rect = section.getBoundingClientRect()
				if (rect.top <= 150 && rect.bottom >= 150) {
					setActiveSection(section.id)
				}
			})
		}

		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	// Smooth scroll dla TOC
	const handleTocClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
		e.preventDefault()
		const element = document.getElementById(sectionId)
		if (element) {
			element.scrollIntoView({ behavior: 'smooth' })
			setActiveSection(sectionId)
		}
	}

	// Oblicz czas czytania
	const calculateReadingTime = (html: string): number => {
		const textContent = html.replace(/<[^>]*>/g, '').trim()
		const wordCount = textContent.split(/\s+/).length
		return Math.max(1, Math.ceil(wordCount / 200)) // 200 słów/min
	}

	const readingTime = calculateReadingTime(post.content)

	// Ekstrahuj sekcje z content
	const getSections = (): Array<{ id: string; title: string }> => {
		const temp = document.createElement('div')
		temp.innerHTML = post.content
		const sections: Array<{ id: string; title: string }> = []

		const sectionElements = temp.querySelectorAll('section[id^="section-"]')
		sectionElements.forEach(section => {
			const heading = section.querySelector('h2, h3')
			if (heading) {
				sections.push({
					id: section.id,
					title: heading.textContent || 'Sekcja',
				})
			}
		})

		return sections
	}

	const sections = getSections()

	return (
		<article className='container mx-auto px-4 max-w-3xl py-12'>
			{/* BACK BUTTON */}
			<div className='mb-8'>
				<Link
					href='/blog'
					className='inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-blue-600 transition-colors'
				>
					← Wróć do bloga
				</Link>
			</div>

			{/* HEADER */}
			<header className='mb-12'>
				{post.image && (
					<div className='relative w-full h-[400px] rounded-3xl overflow-hidden mb-8 shadow-lg'>
						<Image src={post.image} alt={post.title} fill className='object-cover' priority />
					</div>
				)}

				<h1 className='text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight'>{post.title}</h1>

				{post.excerpt && <p className='text-xl text-gray-600 mb-6'>{post.excerpt}</p>}

				<div className='flex flex-wrap gap-4 text-sm text-gray-500 border-b pb-6'>
					<span className='flex items-center gap-2'>
						📅{' '}
						{new Date(post.createdAt).toLocaleDateString('pl-PL', {
							day: 'numeric',
							month: 'long',
							year: 'numeric',
						})}
					</span>
					<span>⏱️ {readingTime} min czytania</span>
					<span>📊 SEO Optimized</span>
				</div>
			</header>

			{/* MAIN CONTENT + SIDEBAR */}
			<div className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
				{/* MAIN CONTENT */}
				<main className='lg:col-span-3 bg-white p-8 rounded-3xl shadow-sm border border-gray-100'>
					<div
						className='prose prose-lg prose-blue max-w-none text-gray-700 leading-relaxed'
						dangerouslySetInnerHTML={{ __html: post.content }}
					/>
				</main>

				{/* SIDEBAR */}
				<aside className='lg:col-span-1 space-y-6'>
					{/* TABLE OF CONTENTS */}
					{sections.length > 0 && (
						<nav className='sticky top-4 bg-gray-50 rounded-lg p-6 border border-gray-200 h-fit'>
							<h2 className='font-bold text-lg mb-4'>📋 Spis Treści</h2>
							<ul className='space-y-2 text-sm'>
								{sections.map(section => (
									<li key={section.id}>
										<a
											href={`#${section.id}`}
											onClick={e => handleTocClick(e, section.id)}
											className={`block px-3 py-2 rounded transition ${
												activeSection === section.id
													? 'bg-blue-500 text-white font-semibold'
													: 'text-gray-700 hover:bg-gray-200'
											}`}
										>
											{section.title}
										</a>
									</li>
								))}
							</ul>
						</nav>
					)}

					{/* FEATURED BOX */}
					<div className='bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500'>
						<h3 className='font-bold mb-3'>💡 Wiesz, że?</h3>
						<p className='text-sm text-gray-700'>
							Artykuły z dobrym spis treści mają <strong>2.5x więcej czasu na stronie</strong> 📈
						</p>
					</div>
				</aside>
			</div>

			{/* POLECANE ARTYKUŁY */}
			{!loading && recommendedBlogs.length > 0 && (
				<section className='my-16 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-8 border border-purple-200'>
					<h2 className='text-3xl font-bold mb-2'>⭐ Polecane Artykuły</h2>
					<p className='text-gray-600 mb-8'>Przeczytaj też inne artykuły na podobne tematy</p>

					<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
						{recommendedBlogs.map(blog => (
							<Link
								key={blog.id}
								href={`/blog/${blog.slug}`}
								className='group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition'
							>
								{blog.image && (
									<div className='relative w-full h-40 overflow-hidden bg-gray-100'>
										<Image
											src={blog.image}
											alt={blog.title}
											fill
											className='object-cover group-hover:scale-105 transition'
										/>
									</div>
								)}
								<div className='p-4'>
									<h3 className='font-bold text-gray-900 group-hover:text-blue-600 transition line-clamp-2'>
										{blog.title}
									</h3>
									<p className='text-sm text-gray-600 mt-2 line-clamp-2'>{blog.excerpt}</p>
									<p className='text-xs text-gray-400 mt-3'>{new Date(blog.createdAt).toLocaleDateString('pl-PL')}</p>
								</div>
							</Link>
						))}
					</div>
				</section>
			)}

			{loading && (
				<section className='my-16 text-center'>
					<p className='text-gray-400'>Ładowanie polecanych artykułów...</p>
				</section>
			)}
		</article>
	)
}
