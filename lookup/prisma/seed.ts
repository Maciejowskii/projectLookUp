import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Czyścimy stare dane
  await prisma.company.deleteMany();
  await prisma.category.deleteMany();
  await prisma.tenant.deleteMany();

  // Tworzymy katalog "Mechanicy"
  const mechanicsTenant = await prisma.tenant.create({
    data: {
      name: "Katalog Mechaników",
      subdomain: "mechanicy",
      description: "Najlepsi mechanicy w Polsce",
    },
  });

  // Kategoria
  const catEngine = await prisma.category.create({
    data: {
      name: "Silniki",
      slug: "silniki",
      tenantId: mechanicsTenant.id,
    },
  });

  // Dodajemy kilka firm testowych
  for (let i = 1; i <= 5; i++) {
    await prisma.company.create({
      data: {
        tenantId: mechanicsTenant.id,
        name: `Auto Serwis ${i}`,
        slug: `auto-serwis-${i}`,
        address: `ul. Prosta ${i}`,
        city: "Warszawa",
        zip: "00-001",
        categoryId: catEngine.id,
        plan: i === 1 ? "PREMIUM" : "FREE",
        phone: "123-456-789",
        description: "Profesjonalna naprawa samochodów z gwarancją.",
      },
    });
  }

  // Tworzymy drugi katalog "Beauty"
  const beautyTenant = await prisma.tenant.create({
    data: {
      name: "Katalog Salonów Beauty",
      subdomain: "beauty",
      description: "Najlepsze salony piękności w Polsce",
    },
  });

  const catHair = await prisma.category.create({
    data: {
      name: "Zabiegi Włosów",
      slug: "zabiegi-wlosow",
      tenantId: beautyTenant.id,
    },
  });

  for (let i = 1; i <= 3; i++) {
    await prisma.company.create({
      data: {
        tenantId: beautyTenant.id,
        name: `Salon Beauty ${i}`,
        slug: `salon-beauty-${i}`,
        address: `ul. Kwiatowa ${i}`,
        city: "Kraków",
        zip: "30-001",
        categoryId: catHair.id,
        plan: "FREE",
        phone: "987-654-321",
        description: "Wysokiej jakości zabiegi pielęgnacyjne.",
      },
    });
  }

  console.log("✅ Seed zakończony! Baza załadowana.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
