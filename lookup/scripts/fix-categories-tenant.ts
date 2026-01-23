/**
 * Script to fix tenantId in categories
 * This script updates all categories that have NULL or incorrect tenantId
 * to use the default tenant (subdomain: 'katalog')
 * 
 * Run: npx tsx scripts/fix-categories-tenant.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixCategoriesTenant() {
	try {
		console.log('🔍 Checking for default tenant...')

		// 1. Znajdź domyślny tenant
		const tenant = await prisma.tenant.findFirst({
			where: {
				OR: [
					{ subdomain: 'katalog' },
					{ subdomain: 'default' },
				],
			},
			orderBy: { createdAt: 'asc' },
		})

		if (!tenant) {
			console.error('❌ Brak domyślnego tenanta!')
			console.log('💡 Uruchom najpierw: npx tsx scripts/create-default-tenant.ts')
			return
		}

		console.log(`✅ Znaleziono tenant: ${tenant.name} (ID: ${tenant.id}, subdomain: ${tenant.subdomain})`)

		// 2. Sprawdź ile kategorii ma problemy
		const categoriesWithNullTenant = await prisma.category.count({
			where: {
				tenantId: null as any,
			},
		})

		const categoriesWithWrongTenant = await prisma.category.count({
			where: {
				tenantId: { not: tenant.id },
			},
		})

		console.log(`\n📊 Statystyki:`)
		console.log(`   Kategorie z NULL tenantId: ${categoriesWithNullTenant}`)
		console.log(`   Kategorie z innym tenantId: ${categoriesWithWrongTenant}`)
		console.log(`   Razem do naprawy: ${categoriesWithNullTenant + categoriesWithWrongTenant}`)

		if (categoriesWithNullTenant === 0 && categoriesWithWrongTenant === 0) {
			console.log('\n✅ Wszystkie kategorie mają poprawny tenantId!')
			return
		}

		// 3. Zaktualizuj kategorie z NULL tenantId
		if (categoriesWithNullTenant > 0) {
			console.log(`\n🔧 Aktualizowanie kategorii z NULL tenantId...`)
			const resultNull = await prisma.category.updateMany({
				where: {
					tenantId: null as any,
				},
				data: {
					tenantId: tenant.id,
				},
			})
			console.log(`   ✅ Zaktualizowano ${resultNull.count} kategorii`)
		}

		// 4. Zaktualizuj kategorie z innym tenantId (opcjonalnie - zakomentuj jeśli chcesz zachować różne tenanty)
		if (categoriesWithWrongTenant > 0) {
			console.log(`\n🔧 Aktualizowanie kategorii z innym tenantId...`)
			const resultWrong = await prisma.category.updateMany({
				where: {
					tenantId: { not: tenant.id },
				},
				data: {
					tenantId: tenant.id,
				},
			})
			console.log(`   ✅ Zaktualizowano ${resultWrong.count} kategorii`)
		}

		// 5. Weryfikacja
		const totalCategories = await prisma.category.count({
			where: {
				tenantId: tenant.id,
			},
		})

		console.log(`\n✅ Naprawa zakończona!`)
		console.log(`   Wszystkich kategorii z tenantId=${tenant.id}: ${totalCategories}`)

		// 6. Sprawdź czy są jeszcze jakieś problemy
		const remainingNull = await prisma.category.count({
			where: {
				tenantId: null as any,
			},
		})

		if (remainingNull > 0) {
			console.log(`\n⚠️  Uwaga: Nadal jest ${remainingNull} kategorii z NULL tenantId`)
			console.log('   To może oznaczać problem z migracją lub schematem bazy danych')
		}

		// 7. Opcjonalnie: sprawdź i napraw również firmy
		const companiesWithNullTenant = await prisma.company.count({
			where: {
				tenantId: null as any,
			},
		})

		const companiesWithWrongTenant = await prisma.company.count({
			where: {
				tenantId: { not: tenant.id },
			},
		})

		if (companiesWithNullTenant > 0 || companiesWithWrongTenant > 0) {
			console.log(`\n📊 Firmy do naprawy:`)
			console.log(`   Firmy z NULL tenantId: ${companiesWithNullTenant}`)
			console.log(`   Firmy z innym tenantId: ${companiesWithWrongTenant}`)
			console.log(`\n💡 Aby naprawić również firmy, uruchom: npx tsx scripts/fix-companies-tenant.ts`)
		}
	} catch (error) {
		console.error('❌ Błąd:', error)
		throw error
	} finally {
		await prisma.$disconnect()
	}
}

fixCategoriesTenant()
	.then(() => {
		console.log('\n✅ Skrypt zakończony pomyślnie!')
		process.exit(0)
	})
	.catch((error) => {
		console.error('❌ Błąd:', error)
		process.exit(1)
	})
