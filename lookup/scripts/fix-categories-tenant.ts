// scripts/fix-all-tenants.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixAll() {
    const correctTenantId = '6fa88c89-015f-4418-b941-196a54aa275d'

    console.log('🔧 Ustawianie wszystkich rekordów na tenant:', correctTenantId)

    // 1. Kategorie
    const categories = await prisma.category.updateMany({
        data: { tenantId: correctTenantId }
    })
    console.log(`✅ Kategorie: ${categories.count}`)

    // 2. Firmy
    const companies = await prisma.company.updateMany({
        data: { tenantId: correctTenantId }
    })
    console.log(`✅ Firmy: ${companies.count}`)

    // 3. Weryfikacja
    console.log('\n📊 Po naprawie:')
    const totalCat = await prisma.category.count()
    const totalComp = await prisma.company.count()
    console.log(`   Kategorie: ${totalCat}`)
    console.log(`   Firmy: ${totalComp}`)

    // Sprawdź czy są teraz firmy w kategoriach
    const sample = await prisma.category.findFirst({
        include: {
            _count: { select: { companies: true } }
        },
        where: {
            companies: { some: {} }
        }
    })

    if (sample) {
        console.log(`\n✅ Przykładowa kategoria: "${sample.name}" ma ${sample._count.companies} firm`)
    }
}

fixAll()
