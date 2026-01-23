// scripts/diagnose-companies.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function diagnose() {
    const correctTenantId = '6fa88c89-015f-4418-b941-196a54aa275d'

    console.log('📊 KATEGORIE:')
    const categoriesByTenant = await prisma.category.groupBy({
        by: ['tenantId'],
        _count: true,
    })
    categoriesByTenant.forEach(g => 
        console.log(`   tenantId ${g.tenantId}: ${g._count} kategorii`)
    )

    console.log('\n📊 FIRMY:')
    const companiesByTenant = await prisma.company.groupBy({
        by: ['tenantId'],
        _count: true,
    })
    companiesByTenant.forEach(g => 
        console.log(`   tenantId ${g.tenantId}: ${g._count} firm`)
    )

    console.log('\n📊 FIRMY PER KATEGORIA (top 10):')
    const categoriesWithCompanies = await prisma.category.findMany({
        include: {
            _count: {
                select: { companies: true }
            }
        },
        orderBy: {
            companies: {
                _count: 'desc'
            }
        },
        take: 10
    })
    
    categoriesWithCompanies.forEach(cat => 
        console.log(`   ${cat.name} (tenantId: ${cat.tenantId}): ${cat._count.companies} firm`)
    )

    console.log('\n📊 FIRMY BEZ KATEGORII:')
    const withoutCategory = await prisma.company.count({
        where: { categoryId: null as unknown as string }
    })
    console.log(`   ${withoutCategory} firm bez categoryId`)

    console.log('\n📊 FIRMY Z NIEWŁAŚCIWYM TENANT:')
    const wrongTenant = await prisma.company.count({
        where: {
            NOT: { tenantId: correctTenantId }
        }
    })
    console.log(`   ${wrongTenant} firm z innym tenantId niż ${correctTenantId}`)
}

diagnose()
