export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import CategoriesAdminClient from './CategoriesAdminClient'

export default async function AdminCategoriesPage() {
	const categories = await prisma.category.findMany({
		orderBy: { name: 'asc' },
		include: { _count: { select: { companies: true } } },
	})

	return <CategoriesAdminClient categories={categories} />
}
