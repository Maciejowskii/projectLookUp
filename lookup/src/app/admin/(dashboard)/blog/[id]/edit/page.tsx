export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import BlogPostView from '@/components/blog/BlogPostView'
import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
	const { slug } = await params
	const post = await prisma.post.findUnique({ where: { slug } })

	if (!post) {
		return { title: 'Artykuł nie znaleziony' }
	}

	return {
		title: `${post.title} | Blog katalogo`,
		description: post.excerpt || post.title,
		openGraph: {
			title: post.title,
			description: post.excerpt || post.title,
			images: post.image ? [{ url: post.image }] : [],
			type: 'article',
			publishedTime: post.createdAt.toISOString(),
		},
		twitter: {
			card: 'summary_large_image',
			title: post.title,
			description: post.excerpt || post.title,
			images: post.image ? [post.image] : [],
		},
	}
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params
	const post = await prisma.post.findUnique({
		where: { slug },
		select: {
			id: true,
			title: true,
			excerpt: true,
			content: true,
			image: true,
			createdAt: true,
		},
	})

	if (!post) {
		return notFound()
	}

	const transformedPost = {
		title: post.title,
		excerpt: post.excerpt || '',
		content: post.content,
		image: post.image || undefined,
		createdAt: post.createdAt.toISOString(),
	}

	return (
		<div className='min-h-screen bg-gray-50 font-sans flex flex-col'>
			<Navbar />

			<main className='flex-grow pt-20'>
				<BlogPostView post={transformedPost} postId={post.id} />
			</main>

			<Footer />
		</div>
	)
}
