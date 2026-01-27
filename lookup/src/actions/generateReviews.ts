"use server";

import { prisma } from '@/lib/prisma'
import { OpenAI } from 'openai'

// Polskie imiona i nazwiska dla generowania danych
const POLISH_FIRST_NAMES = [
  'Jan', 'Anna', 'Piotr', 'Maria', 'Krzysztof', 'Katarzyna', 'Andrzej', 'Agnieszka',
  'Tomasz', 'Barbara', 'Paweł', 'Ewa', 'Marcin', 'Magdalena', 'Michał', 'Joanna',
  'Jakub', 'Monika', 'Kamil', 'Natalia', 'Marek', 'Karolina', 'Łukasz', 'Aleksandra',
  'Adam', 'Paulina', 'Bartosz', 'Justyna', 'Dawid', 'Patrycja', 'Sylwia',
  'Dariusz', 'Dominika', 'Grzegorz', 'Marta', 'Robert', 'Kinga', 'Sebastian', 'Weronika',
  'Mariusz', 'Aneta', 'Kacper', 'Angelika', 'Dominik', 'Filip', 'Olga',
  'Wojciech', 'Aleksander', 'Mikołaj', 'Julia', 'Zuzanna', 'Hanna', 'Emilia', 'Oliwia',
  'Antoni', 'Franciszek', 'Stanisław', 'Leon', 'Maksymilian', 'Wiktor', 'Tymon', 'Ignacy',
  'Lena', 'Zofia', 'Maja', 'Amelia', 'Liliana', 'Pola', 'Laura', 'Klara',
  'Rafał', 'Kamil', 'Szymon', 'Mateusz', 'Oskar', 'Fabian', 'Bruno', 'Kuba',
  'Wiktoria', 'Nadia', 'Milena', 'Liliana', 'Iga', 'Róża', 'Helena', 'Antonina',
  'Tadeusz', 'Jerzy', 'Henryk', 'Zbigniew', 'Wiesław', 'Bogdan', 'Ryszard', 'Waldemar',
  'Danuta', 'Halina', 'Irena', 'Jadwiga', 'Janina', 'Krystyna', 'Zofia', 'Teresa'
]

const POLISH_LAST_NAMES = [
  'Kowalski', 'Nowak', 'Wiśniewski', 'Wójcik', 'Kowalczyk', 'Kamiński', 'Lewandowski',
  'Zieliński', 'Szymański', 'Woźniak', 'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur',
  'Kwiatkowski', 'Krawczyk', 'Piotrowski', 'Grabowski', 'Nowakowski', 'Pawłowski',
  'Michalski', 'Nowicki', 'Adamczyk', 'Dudek', 'Zając', 'Wieczorek', 'Jabłoński',
  'Król', 'Majewski', 'Olszewski', 'Jaworski', 'Wróbel', 'Malinowski', 'Pawlak',
  'Witkowski', 'Walczak', 'Stepień', 'Górski', 'Rutkowski', 'Michalak', 'Sikora',
  'Baran', 'Czarnecki', 'Duda', 'Głowacki', 'Jasiński', 'Kubiak', 'Lis', 'Makowski',
  'Nowicki', 'Ostrowski', 'Pietrzak', 'Rogowski', 'Sobczak', 'Urbański', 'Wilk', 'Zawadzki',
  'Bąk', 'Cieślak', 'Dąbrowski', 'Gajewski', 'Jaworski', 'Kowal', 'Lipiński', 'Mazur',
  'Nawrocki', 'Orłowski', 'Pawlak', 'Rutkowski', 'Sawicki', 'Tomczak', 'Wróblewski', 'Ziółkowski',
  'Bednarek', 'Czajkowski', 'Dębski', 'Górny', 'Jóźwiak', 'Kędzierski', 'Laskowski', 'Mróz',
  'Niedzielski', 'Olszewski', 'Piątek', 'Ratajczak', 'Sokołowski', 'Tomaszewski', 'Wysocki', 'Żak',
  'Bielecki', 'Chmielewski', 'Dobrowolski', 'Górka', 'Jędrzejewski', 'Konieczny', 'Leszczyński', 'Matusiak',
  'Noga', 'Olejnik', 'Przybylski', 'Rogala', 'Stępień', 'Turek', 'Wojciechowski', 'Żurek'
]

const POLISH_DOMAINS = ['gmail.com', 'wp.pl', 'o2.pl', 'onet.pl', 'interia.pl', 'poczta.pl']

// Funkcja do generowania losowego polskiego imienia i nazwiska
function generatePolishName(): { firstName: string; lastName: string; fullName: string } {
  const firstName = POLISH_FIRST_NAMES[Math.floor(Math.random() * POLISH_FIRST_NAMES.length)]
  const lastName = POLISH_LAST_NAMES[Math.floor(Math.random() * POLISH_LAST_NAMES.length)]
  const fullName = `${firstName} ${lastName.charAt(0)}.`
  return { firstName, lastName, fullName }
}

// Funkcja do generowania losowego emaila
function generateEmail(firstName: string, lastName: string): string {
  const domain = POLISH_DOMAINS[Math.floor(Math.random() * POLISH_DOMAINS.length)]
  const variants = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}@${domain}`,
    `${firstName.toLowerCase()}${Math.floor(Math.random() * 99) + 1}@${domain}`,
    `${firstName.toLowerCase()}_${lastName.toLowerCase()}@${domain}`
  ]
  return variants[Math.floor(Math.random() * variants.length)]
}

// Funkcja do generowania numeru telefonu dla bota (zawsze "000 000 000")
function generatePhone(): string {
  // Bot zawsze używa tego samego numeru, aby można było go rozpoznać w panelu admina
  return '000 000 000'
}

// Funkcja do generowania opinii przez OpenAI
async function generateReviewWithAI(
  openai: OpenAI,
  companyName: string,
  companyCategory: string,
  companyCity: string | null,
  isNegative: boolean,
  shouldIncludeCompanyName: boolean
): Promise<{ rating: number; comment: string }> {
  const rating = isNegative 
    ? Math.floor(Math.random() * 2) + 1 // 1-2 gwiazdki dla negatywnych
    : Math.floor(Math.random() * 3) + 3 // 3-5 gwiazdek dla pozytywnych
  
  const sentenceCount = Math.random() < 0.7 
    ? Math.floor(Math.random() * 2) + 2 // 70% szans na 2-3 zdania
    : Math.floor(Math.random() * 3) + 4 // 30% szans na 4-5 zdań

  const tone = isNegative ? 'krytyczną, ale konstruktywną' : 'pozytywną i entuzjastyczną'
  const includeName = shouldIncludeCompanyName ? `używając nazwy firmy "${companyName}"` : 'nie używając nazwy firmy'
  
  const prompt = `Napisz krótką opinię klienta o firmie z branży "${companyCategory}"${companyCity ? ` z ${companyCity}` : ''}. 

WAŻNE:
- Pisz jak zwykły człowiek, nie jak AI - używaj prostego języka, bez formalnych zwrotów
- NIE używaj myślników na początku zdań
- NIE używaj list punktowanych
- NIE pisz w stylu "Chciałbym podzielić się opinią..." - pisz bezpośrednio
- Używaj potocznego języka, skrótów, czasem emotikon (ale rzadko)
- ${includeName}
- Dokładnie ${sentenceCount} zdania
- ${isNegative ? 'Pisz o problemach: opóźnienia, słaba komunikacja, drogie ceny, niska jakość.' : 'Pisz o zaletach: profesjonalizm, szybkość, dobra jakość, miła obsługa, dobre ceny.'}
- Ocena: ${rating}/5 gwiazdek
- Pisz krótko i konkretnie, jakbyś pisał SMS lub komentarz na Facebooku

Przykłady DOBRYCH opinii:
- "Świetna firma, szybko zrealizowali zamówienie. Polecam!"
- "Profesjonalna obsługa i dobra jakość. Na pewno wrócę."
- "Nie polecam. Długie oczekiwanie i drogo jak na to co oferują."

Przykłady ZŁYCH opinii (NIE pisz tak):
- "Chciałbym podzielić się moją opinią na temat..."
- "- Profesjonalna obsługa
- Szybka realizacja
- Gorąco polecam"
- "Firma oferuje profesjonalne usługi, które spełniają oczekiwania klientów."`

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Jesteś zwykłym klientem piszącym opinię. Pisz jak prawdziwy człowiek - prosto, bezpośrednio, bez formalności. Używaj potocznego języka. NIE pisz jak AI - unikaj długich myślników, list punktowanych i formalnych zwrotów. Pisz krótko i konkretnie.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.8
    })

    const comment = response.choices[0]?.message?.content?.trim() || ''
    
    if (!comment) {
      throw new Error('OpenAI nie zwróciło treści opinii')
    }

    return { rating, comment }
  } catch (error) {
    console.error(`Błąd generowania opinii przez OpenAI:`, error)
    // Fallback - prosta opinia bez AI
    const fallbackComments = isNegative 
      ? [
          'Nie polecam. Słaba jakość usług.',
          'Długie oczekiwanie na realizację. Rozczarowanie.',
          'Drogo jak na oferowaną jakość.'
        ]
      : [
          'Profesjonalna obsługa, polecam!',
          'Szybka realizacja, zadowolony z usługi.',
          'Bardzo miła obsługa i dobra jakość.',
          'Polecam, wszystko na czas.',
          'Dobra cena, dobra jakość. Zdecydowanie polecam!'
        ]
    
    return {
      rating,
      comment: fallbackComments[Math.floor(Math.random() * fallbackComments.length)]
    }
  }
}

export async function generateReviewsForCompanies() {
  console.log('🚀 Rozpoczynam generowanie opinii dla firm...\n')

  // Sprawdź czy nie trwa deployment
  if (process.env.DEPLOYING === 'true' || process.env.SKIP_REVIEW_GENERATION === 'true') {
    console.log('⏸️  Pomijam generowanie opinii - trwa deployment')
    return {
      success: false,
      skipped: true,
      message: 'Review generation skipped - deployment in progress'
    }
  }

  // Sprawdź czy OpenAI API key jest dostępny
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    throw new Error('Brak OPENAI_API_KEY w zmiennych środowiskowych')
  }

  const openai = new OpenAI({ apiKey: openaiApiKey })

  // Pobierz wszystkie firmy
  const allCompanies = await prisma.company.findMany({
    include: {
      category: true
    }
  })

  console.log(`📊 Znaleziono ${allCompanies.length} firm\n`)

  // Wybierz 80% firm losowo (lub maksymalnie tyle ile w MAX_COMPANIES_FOR_REVIEWS)
  const maxCompaniesEnv = process.env.MAX_COMPANIES_FOR_REVIEWS
  const maxCompanies = maxCompaniesEnv ? parseInt(maxCompaniesEnv, 10) : undefined
  
  let companiesToReview = allCompanies.sort(() => Math.random() - 0.5).slice(
    0, 
    Math.floor(allCompanies.length * 0.8)
  )
  
  // Jeśli jest limit, zastosuj go
  if (maxCompanies && companiesToReview.length > maxCompanies) {
    companiesToReview = companiesToReview.slice(0, maxCompanies)
    console.log(`⚠️  Limit MAX_COMPANIES_FOR_REVIEWS: ${maxCompanies}, przetworzę tylko tyle firm\n`)
  }

  console.log(`🎲 Wybrano ${companiesToReview.length} firm do dodania opinii (80%)\n`)

  let totalReviewsCreated = 0
  let companiesProcessed = 0
  const errors: string[] = []

  for (const company of companiesToReview) {
    companiesProcessed++
    
    try {
      // Sprawdź ile opinii już ma firma
      const existingReviewsCount = await prisma.review.count({
        where: { companyId: company.id }
      })

      // Jeśli firma już ma opinie, pomiń ją (lub dodaj więcej jeśli ma mniej niż 5)
      if (existingReviewsCount > 0) {
        console.log(`⏭️  [${companiesProcessed}/${companiesToReview.length}] ${company.name} - już ma ${existingReviewsCount} opinii, pomijam`)
        continue
      }

      // Losuj ile opinii ma dostać firma (1-10)
      const reviewsCount = Math.floor(Math.random() * 10) + 1

      console.log(`\n📝 [${companiesProcessed}/${companiesToReview.length}] ${company.name}`)
      console.log(`   Generuję ${reviewsCount} opinii...`)

      const reviewsToCreate = []

      for (let i = 0; i < reviewsCount; i++) {
        // 5% szans na negatywną opinię
        const isNegative = Math.random() < 0.05
        
        // 50% szans na użycie nazwy firmy w opinii
        const shouldIncludeCompanyName = Math.random() < 0.5

        // Generuj opinię przez OpenAI
        const { rating, comment } = await generateReviewWithAI(
          openai,
          company.name,
          company.category.name,
          company.city,
          isNegative,
          shouldIncludeCompanyName
        )

        // Generuj dane użytkownika
        const { fullName, firstName, lastName } = generatePolishName()
        const email = generateEmail(firstName, lastName)
        const phone = generatePhone()

        // Losuj datę utworzenia (ostatnie 6 miesięcy)
        const createdAt = new Date()
        const daysAgo = Math.floor(Math.random() * 180)
        createdAt.setDate(createdAt.getDate() - daysAgo)
        createdAt.setHours(Math.floor(Math.random() * 24))
        createdAt.setMinutes(Math.floor(Math.random() * 60))

        reviewsToCreate.push({
          companyId: company.id,
          rating,
          comment,
          userName: fullName,
          userEmail: email,
          userPhone: phone,
          createdAt
        })

        // Małe opóźnienie między generowaniem opinii
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Zapisz wszystkie opinie dla tej firmy
      await prisma.review.createMany({
        data: reviewsToCreate
      })

      totalReviewsCreated += reviewsToCreate.length
      console.log(`   ✅ Dodano ${reviewsToCreate.length} opinii`)

      // Opóźnienie między firmami (zmniejszone dla szybszego przetwarzania)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Co 50 firm, wykonaj garbage collection hint i daj systemowi odpocząć
      if (companiesProcessed % 50 === 0) {
        console.log(`   💤 Przerwa po ${companiesProcessed} firmach...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        // Wymuś garbage collection jeśli dostępne
        if (global.gc) {
          global.gc()
        }
      }
    } catch (error) {
      const errorMsg = `Błąd dla firmy ${company.name}: ${error instanceof Error ? error.message : String(error)}`
      console.error(`   ❌ ${errorMsg}`)
      errors.push(errorMsg)
    }
  }

  return {
    success: true,
    totalCompanies: allCompanies.length,
    companiesProcessed,
    reviewsCreated: totalReviewsCreated,
    averageReviewsPerCompany: companiesProcessed > 0 ? (totalReviewsCreated / companiesProcessed).toFixed(1) : '0',
    errors: errors.length > 0 ? errors : undefined
  }
}
