'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function claimCompanyAction(formData: FormData) {
	const cookieStore = await cookies()
	const userId = cookieStore.get('session_user_id')?.value

	if (!userId) {
		throw new Error('Musisz być zalogowany, aby przejąć firmę')
	}

	const companySlug = formData.get('companySlug') as string

	if (!companySlug) {
		throw new Error('Wprowadź slug firmy')
	}

	// Znajdź firmę po slug
	const company = await prisma.company.findFirst({
		where: { slug: companySlug },
	})

	if (!company) {
		throw new Error('Nie znaleziono firmy o podanym slug')
	}

	// Sprawdź czy użytkownik już ma tę firmę (nowa relacja CompanyUser)
	const existingRelation = await prisma.companyUser.findFirst({
		where: {
			userId,
			companyId: company.id,
		},
	})

	if (existingRelation) {
		throw new Error('Już posiadasz tę firmę')
	}

	// Sprawdź legacy companyId (dla użytkowników z poprzednią strukturą)
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { companyId: true },
	})

	if (user?.companyId === company.id) {
		throw new Error('Już posiadasz tę firmę')
	}

	// Sprawdź czy firma ma już właściciela
	const existingOwners = await prisma.companyUser.findMany({
		where: { companyId: company.id },
	})

	if (existingOwners.length > 0) {
		// Firma ma właściciela - utwórz zgłoszenie
		await prisma.claimRequest.create({
			data: {
				companyId: company.id,
				fullName: 'Użytkownik z dashboardu',
				email: '', // Będzie pobrane z user
				phone: '',
				status: 'PENDING',
				message: `Użytkownik ${userId} próbuje przejąć firmę z dashboardu.`,
			},
		})

		redirect('/dashboard?status=claim_pending')
	} else {
		// Firma nie ma właściciela - automatycznie przypisz
		await prisma.companyUser.create({
			data: {
				userId,
				companyId: company.id,
				role: 'OWNER',
			},
		})

		// Zweryfikuj firmę
		await prisma.company.update({
			where: { id: company.id },
			data: { isVerified: true },
		})

		redirect(`/dashboard?companyId=${company.id}&status=claimed_successfully`)
	}
}
