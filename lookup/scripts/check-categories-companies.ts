/**
 * Script to check if companies are properly linked to categories
 * Run: npx tsx scripts/check-categories-companies.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCategoriesCompanies() {
	try {
		console.log('🔍 Checking categories and companies...\n')

		// 1. Pobierz wszystkie kategorie
		const categories = await prisma.category.findMany({
			select: {
				id: true,
				name: true,
				slug: true,
				tenantId: true,
			},
			take: 10, // Sprawdź pierwsze 10 kategorii
		})

		console.log(`Found ${categories.length} categories (showing first 10)\n`)

		for (const category of categories) {
			// Licz firmy dla każdej kategorii
			const companyCount = await prisma.company.count({
				where: {
					categoryId: category.id,
				},
			})

			// Sprawdź czy są firmy z tym categoryId ale innym tenantId
			const companiesWithDifferentTenant = await prisma.company.findMany({
				where: {
					categoryId: category.id,
					tenantId: { not: category.tenantId },
				},
				select: {
					id: true,
					name: true,
					tenantId: true,
				},
				take: 5,
			})

			console.log(`📁 ${category.name} (${category.slug})`)
			console.log(`   ID: ${category.id}`)
			console.log(`   Tenant ID: ${category.tenantId}`)
			console.log(`   Companies: ${companyCount}`)

			if (companiesWithDifferentTenant.length > 0) {
				console.log(`   ⚠️  Found ${companiesWithDifferentTenant.length} companies with different tenantId:`)
				companiesWithDifferentTenant.forEach((c) => {
					console.log(`      - ${c.name} (tenantId: ${c.tenantId})`)
				})
			}
			console.log('')
		}

		// 2. Sprawdź firmy bez kategorii
		const companiesWithoutCategory = await prisma.company.count({
			where: {
				categoryId: null as any, // TypeScript hack
			},
		})

		console.log(`\n⚠️  Companies without category: ${companiesWithoutCategory}`)

		// 3. Sprawdź firmy z nieistniejącymi kategoriami
		const allCompanies = await prisma.company.findMany({
			select: {
				id: true,
				name: true,
				categoryId: true,
			},
			take: 100,
		})

		const invalidCategoryIds = []
		for (const company of allCompanies) {
			if (company.categoryId) {
				const categoryExists = await prisma.category.findUnique({
					where: { id: company.categoryId },
				})
				if (!categoryExists) {
					invalidCategoryIds.push({
						companyId: company.id,
						companyName: company.name,
						categoryId: company.categoryId,
					})
				}
			}
		}

		if (invalidCategoryIds.length > 0) {
			console.log(`\n❌ Found ${invalidCategoryIds.length} companies with invalid categoryId:`)
			invalidCategoryIds.slice(0, 10).forEach((item) => {
				console.log(`   - ${item.companyName} (categoryId: ${item.categoryId} - NOT FOUND)`)
			})
		}

		// 4. Statystyki
		const totalCompanies = await prisma.company.count()
		const totalCategories = await prisma.category.count()
		const companiesWithCategory = await prisma.company.count({
			where: {
				categoryId: { not: null as any },
			},
		})

		console.log(`\n📊 Statistics:`)
		console.log(`   Total companies: ${totalCompanies}`)
		console.log(`   Total categories: ${totalCategories}`)
		console.log(`   Companies with category: ${companiesWithCategory}`)
		console.log(`   Companies without category: ${totalCompanies - companiesWithCategory}`)
	} catch (error) {
		console.error('❌ Error:', error)
		throw error
	} finally {
		await prisma.$disconnect()
	}
}

checkCategoriesCompanies()
	.then(() => {
		console.log('\n✅ Check completed!')
		process.exit(0)
	})
	.catch((error) => {
		console.error('❌ Error:', error)
		process.exit(1)
	})
