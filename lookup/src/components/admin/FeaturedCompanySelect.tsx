import { prisma } from '@/lib/prisma'

interface FeaturedCompanySelectProps {
	defaultValue?: string
}

export async function FeaturedCompanySelect({ defaultValue }: FeaturedCompanySelectProps) {
	const companies = await prisma.company.findMany({
		select: {
			id: true,
			name: true,
		},
		orderBy: {
			name: 'asc',
		},
		take: 500, // Limit dla wydajności
	})

	return (
		<select
			name="featured_company_id"
			defaultValue={defaultValue || ''}
			className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
		>
			<option value="">-- Brak wyróżnienia --</option>
			{companies.map((company) => (
				<option key={company.id} value={company.id}>
					{company.name}
				</option>
			))}
		</select>
	)
}
