/**
 * Skrypt do tworzenia konta administratora
 *
 * Użycie:
 * npx tsx scripts/create-admin.ts <email> <password> [name]
 *
 * Przykład:
 * npx tsx scripts/create-admin.ts admin@example.com MojeSecretHaslo123! "Jan Kowalski"
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
	const args = process.argv.slice(2)

	if (args.length < 2) {
		console.log('❌ Błąd: Podaj email i hasło')
		console.log('')
		console.log('Użycie:')
		console.log('  npx tsx scripts/create-admin.ts <email> <password> [name]')
		console.log('')
		console.log('Przykład:')
		console.log('  npx tsx scripts/create-admin.ts admin@example.com MojeHaslo123! "Jan Kowalski"')
		process.exit(1)
	}

	const email = args[0].toLowerCase().trim()
	const password = args[1]
	const name = args[2] || 'Administrator'

	// Walidacja email
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	if (!emailRegex.test(email)) {
		console.log('❌ Błąd: Nieprawidłowy format adresu email')
		process.exit(1)
	}

	// Walidacja hasła
	if (password.length < 8) {
		console.log('❌ Błąd: Hasło musi mieć minimum 8 znaków')
		process.exit(1)
	}

	console.log('')
	console.log('🔐 Tworzenie konta administratora...')
	console.log(`   Email: ${email}`)
	console.log(`   Nazwa: ${name}`)
	console.log('')

	try {
		// Sprawdź czy użytkownik już istnieje
		const existingUser = await prisma.user.findUnique({
			where: { email },
		})

		const hashedPassword = await bcrypt.hash(password, 12)

		if (existingUser) {
			// Aktualizuj istniejącego użytkownika
			await prisma.user.update({
				where: { email },
				data: {
					password: hashedPassword,
					role: 'ADMIN',
					name,
				},
			})
			console.log('✅ Zaktualizowano istniejące konto na administratora')
		} else {
			// Utwórz nowego użytkownika
			await prisma.user.create({
				data: {
					email,
					password: hashedPassword,
					role: 'ADMIN',
					name,
				},
			})
			console.log('✅ Utworzono nowe konto administratora')
		}

		console.log('')
		console.log('🎉 Gotowe! Możesz teraz zalogować się na:')
		console.log('   /admin/login')
		console.log('')
	} catch (error) {
		console.error('❌ Błąd podczas tworzenia administratora:', error)
		process.exit(1)
	} finally {
		await prisma.$disconnect()
	}
}

main()
