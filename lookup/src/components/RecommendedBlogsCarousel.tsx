'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface BlogPost {
	id: string
	slug: string
	title: string
	excerpt: string | null
	image: string | null
	createdAt: string
}

interface RecommendedBlogsCarouselProps {
	currentPostId: string
}

export function RecommendedBlogsCarousel({ currentPostId }: RecommendedBlogsCarouselProps) {
	const [blogs, setBlogs] = useState<BlogPost[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isPaused, setIsPaused] = useState(false)
	const scrollRef = useRef<HTMLDivElement>(null)
	const animationRef = useRef<number>()

	useEffect(() => {
		const fetchBlogs = async () => {
			try {
				const res = await fetch(`/api/blog/recommended?excludePostId=${currentPostId}&limit=10`)
				if (res.ok) {
					const data = await res.json()
					// Podwajamy blogi dla efektu infinite loop
					setBlogs([...data, ...data])
				}
			} catch (error) {
				console.error('Failed to fetch recommended blogs:', error)
			} finally {
				setIsLoading(false)
			}
		}
		fetchBlogs()
	}, [currentPostId])

	// Auto-scroll animation
	useEffect(() => {
		if (!scrollRef.current || blogs.length === 0 || isPaused) return

		let scrollPosition = 0
		const cardWidth = 320 // szerokość karty + gap
		const totalWidth = (blogs.length / 2) * cardWidth // połowa bo podwojone

		const animate = () => {
			if (!scrollRef.current || isPaused) return
			
			scrollPosition += 0.5 // prędkość scrollowania
			
			// Reset do początku gdy przescrollowaliśmy połowę (oryginalne blogi)
			if (scrollPosition >= totalWidth) {
				scrollPosition = 0
			}
			
			scrollRef.current.scrollLeft = scrollPosition
			animationRef.current = requestAnimationFrame(animate)
		}

		animationRef.current = requestAnimationFrame(animate)

		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current)
			}
		}
	}, [blogs, isPaused])

	const scroll = (direction: 'left' | 'right') => {
		if (!scrollRef.current) return
		const scrollAmount = 320
		scrollRef.current.scrollBy({
			left: direction === 'left' ? -scrollAmount : scrollAmount,
			behavior: 'smooth',
		})
	}

	if (isLoading) {
		return (
			<div className="py-12 bg-gradient-to-r from-gray-50 to-gray-100">
				<div className="container mx-auto px-4">
					<h2 className="text-2xl font-bold text-gray-900 mb-6">📖 Polecane artykuły</h2>
					<div className="flex gap-6 overflow-hidden">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="min-w-[300px] h-64 bg-gray-200 rounded-2xl animate-pulse" />
						))}
					</div>
				</div>
			</div>
		)
	}

	if (blogs.length === 0) return null

	return (
		<section className="py-16 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
			<div className="container mx-auto px-4">
				<div className="flex items-center justify-between mb-8">
					<div>
						<h2 className="text-3xl font-extrabold text-gray-900 mb-2">📖 Polecane artykuły</h2>
						<p className="text-gray-600">Odkryj więcej interesujących treści</p>
					</div>
					<div className="flex gap-2">
						<button
							onClick={() => scroll('left')}
							className="p-3 bg-white rounded-full shadow-md hover:shadow-lg transition-all hover:bg-gray-50 border border-gray-100"
							aria-label="Poprzedni"
						>
							<ChevronLeft size={20} className="text-gray-700" />
						</button>
						<button
							onClick={() => scroll('right')}
							className="p-3 bg-white rounded-full shadow-md hover:shadow-lg transition-all hover:bg-gray-50 border border-gray-100"
							aria-label="Następny"
						>
							<ChevronRight size={20} className="text-gray-700" />
						</button>
					</div>
				</div>

				<div
					ref={scrollRef}
					className="flex gap-6 overflow-x-auto scrollbar-hide pb-4"
					style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
					onMouseEnter={() => setIsPaused(true)}
					onMouseLeave={() => setIsPaused(false)}
					onTouchStart={() => setIsPaused(true)}
					onTouchEnd={() => setIsPaused(false)}
				>
					{blogs.map((blog, index) => (
						<Link
							key={`${blog.id}-${index}`}
							href={`/blog/${blog.slug}`}
							className="group min-w-[300px] max-w-[300px] bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 flex-shrink-0"
						>
							{/* Image */}
							<div className="relative h-40 overflow-hidden bg-gray-100">
								{blog.image ? (
									<Image
										src={blog.image}
										alt={blog.title}
										fill
										className="object-cover group-hover:scale-105 transition-transform duration-500"
									/>
								) : (
									<div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
										<span className="text-4xl">📝</span>
									</div>
								)}
								<div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
							</div>

							{/* Content */}
							<div className="p-5">
								<h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
									{blog.title}
								</h3>
								{blog.excerpt && (
									<p className="text-sm text-gray-500 line-clamp-2 mb-3">{blog.excerpt}</p>
								)}
								<div className="flex items-center justify-between">
									<span className="text-xs text-gray-400">
										{new Date(blog.createdAt).toLocaleDateString('pl-PL', {
											day: 'numeric',
											month: 'short',
										})}
									</span>
									<span className="text-xs font-bold text-blue-600 group-hover:text-blue-700">
										Czytaj więcej →
									</span>
								</div>
							</div>
						</Link>
					))}
				</div>

				{/* Scroll indicator */}
				<div className="flex justify-center mt-6">
					<div className="flex gap-1">
						{Array.from({ length: Math.min(5, blogs.length / 2) }).map((_, i) => (
							<div
								key={i}
								className="w-2 h-2 rounded-full bg-blue-200"
							/>
						))}
					</div>
				</div>
			</div>

			<style jsx>{`
				.scrollbar-hide::-webkit-scrollbar {
					display: none;
				}
			`}</style>
		</section>
	)
}
