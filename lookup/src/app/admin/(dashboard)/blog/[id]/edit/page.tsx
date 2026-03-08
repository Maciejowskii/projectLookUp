export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import BlogPostEditor from '@/components/admin/BlogPostEditor'

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params

	const post = await prisma.post.findUnique({
		where: { id },
		select: {
			id: true,
			title: true,
			excerpt: true,
			content: true,
			image: true,
		},
	})

	if (!post) {
		return notFound()
	}

	return (
		<BlogPostEditor
			mode='edit'
			initialData={{
				id: post.id,
				title: post.title,
				excerpt: post.excerpt || '',
				content: post.content,
				image: post.image,
			}}
		/>
	)
}
