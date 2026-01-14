/**
 * Script to create a default tenant in the database
 * Run: npx tsx scripts/create-default-tenant.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createDefaultTenant() {
	try {
		console.log('🔍 Checking for existing tenant...')

		// Check if tenant already exists
		const existingTenant = await prisma.tenant.findFirst({
			where: {
				OR: [{ subdomain: 'katalog' }, { subdomain: 'default' }],
			},
		})

		if (existingTenant) {
			console.log('✅ Tenant already exists:')
			console.log(`   ID: ${existingTenant.id}`)
			console.log(`   Name: ${existingTenant.name}`)
			console.log(`   Subdomain: ${existingTenant.subdomain}`)
			return
		}

		console.log('📝 Creating default tenant...')

		// Create default tenant
		const tenant = await prisma.tenant.create({
			data: {
				name: 'Katalog Firm',
				subdomain: 'katalog',
				description: 'Domyślny katalog firm',
			},
		})

		console.log('✅ Default tenant created successfully!')
		console.log(`   ID: ${tenant.id}`)
		console.log(`   Name: ${tenant.name}`)
		console.log(`   Subdomain: ${tenant.subdomain}`)
	} catch (error) {
		console.error('❌ Error creating tenant:', error)
		throw error
	} finally {
		await prisma.$disconnect()
	}
}

createDefaultTenant()
	.then(() => {
		console.log('\n✨ Script completed successfully')
		process.exit(0)
	})
	.catch(error => {
		console.error('\n❌ Script failed:', error)
		process.exit(1)
	})
