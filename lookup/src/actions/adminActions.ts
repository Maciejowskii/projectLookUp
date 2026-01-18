'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { checkAdminAuth, logAdminAction } from '@/lib/adminAuth'

export async function approveClaim(claimId: string) {
	const admin = await checkAdminAuth()

	// 1. Pobierz zgłoszenie
	const claim = await prisma.claimRequest.findUnique({
		where: { id: claimId },
		include: { company: { select: { name: true } } },
	})

	if (!claim) throw new Error('Nie znaleziono zgłoszenia')

	// 2. Zaktualizuj status zgłoszenia
	await prisma.claimRequest.update({
		where: { id: claimId },
		data: { status: 'APPROVED' },
	})

	// 3. Znajdź użytkownika po emailu (jeśli istnieje konto)
	const user = await prisma.user.findUnique({
		where: { email: claim.email },
		select: { id: true, companyId: true },
	})

	// 4. Jeśli użytkownik istnieje i nie ma jeszcze przypisanej firmy, przypisz firmę
	if (user) {
		if (!user.companyId) {
			// Użytkownik istnieje i nie ma firmy - bezpiecznie przypisz
			await prisma.user.update({
				where: { id: user.id },
				data: { companyId: claim.companyId },
			})
		} else if (user.companyId !== claim.companyId) {
			// Użytkownik ma już inną firmę - nie nadpisujemy (bezpieczeństwo danych)
			console.log(`⚠️ User ${user.id} already has company ${user.companyId}, cannot assign ${claim.companyId}`)
		}
		// Jeśli user.companyId === claim.companyId, wszystko jest już OK
	}

	// 5. Pobierz firmę, żeby sprawdzić czy ma już email
	const company = await prisma.company.findUnique({
		where: { id: claim.companyId },
		select: { email: true },
	})

	// 6. Zaktualizuj firmę (zweryfikuj ją)
	const updateData: { isVerified: boolean; email?: string } = {
		isVerified: true,
	}

	if (claim.email && (!company || !company.email)) {
		updateData.email = claim.email
	}

	await prisma.company.update({
		where: { id: claim.companyId },
		data: updateData,
	})

	// Audit log
	await logAdminAction(admin.id, 'APPROVE_CLAIM', claimId, {
		companyId: claim.companyId,
		companyName: claim.company?.name,
		claimEmail: claim.email,
	})

	revalidatePath('/admin/zgloszenia')
	revalidatePath(`/firma`)
}

export async function rejectClaim(claimId: string) {
	const admin = await checkAdminAuth()

	const claim = await prisma.claimRequest.findUnique({
		where: { id: claimId },
		include: { company: { select: { name: true } } },
	})

	await prisma.claimRequest.update({
		where: { id: claimId },
		data: { status: 'REJECTED' },
	})

	// Audit log
	await logAdminAction(admin.id, 'REJECT_CLAIM', claimId, {
		companyId: claim?.companyId,
		companyName: claim?.company?.name,
	})

	revalidatePath('/admin/zgloszenia')
}

export async function deleteReview(reviewId: string) {
	const admin = await checkAdminAuth()

	const review = await prisma.review.findUnique({
		where: { id: reviewId },
		include: { company: { select: { name: true } } },
	})

	await prisma.review.delete({
		where: { id: reviewId },
	})

	// Audit log
	await logAdminAction(admin.id, 'DELETE_REVIEW', reviewId, {
		companyId: review?.companyId,
		companyName: review?.company?.name,
		userName: review?.userName,
		rating: review?.rating,
	})

	revalidatePath('/admin/reviews')
}

// --- KATEGORIE ---

export async function createCategory(formData: FormData) {
	const admin = await checkAdminAuth()

	const name = formData.get('name') as string

	// Prosty slug generator
	const slug = name
		.toLowerCase()
		.replace(/ł/g, 'l')
		.replace(/ś/g, 's')
		.replace(/ć/g, 'c')
		.replace(/ą/g, 'a')
		.replace(/ę/g, 'e')
		.replace(/ń/g, 'n')
		.replace(/ź/g, 'z')
		.replace(/ż/g, 'z')
		.replace(/ó/g, 'o')
		.replace(/[^a-z0-9]/g, '-')
		.replace(/-+/g, '-')

	const defaultTenant = await prisma.tenant.findFirst()
	if (!defaultTenant) throw new Error('Brak Tenanta w bazie!')

	const category = await prisma.category.create({
		data: {
			name,
			slug,
			tenantId: defaultTenant.id,
		},
	})

	// Audit log
	await logAdminAction(admin.id, 'CREATE_CATEGORY', category.id, {
		name,
		slug,
	})

	revalidatePath('/admin/categories')
}

export async function deleteCategory(id: string) {
	const admin = await checkAdminAuth()

	const category = await prisma.category.findUnique({
		where: { id },
		select: { name: true },
	})

	await prisma.category.delete({ where: { id } })

	// Audit log
	await logAdminAction(admin.id, 'DELETE_CATEGORY', id, {
		name: category?.name,
	})

	revalidatePath('/admin/categories')
}

// --- USTAWIENIA GLOBALNE ---

export async function updateSettings(formData: FormData) {
	const admin = await checkAdminAuth()

	const entries = Array.from(formData.entries())
	const changes: Record<string, string> = {}

	for (const [key, value] of entries) {
		if (!key.startsWith('$')) {
			changes[key] = value as string
			await prisma.setting.upsert({
				where: { key },
				update: { value: value as string },
				create: { key, value: value as string },
			})
		}
	}

	// Audit log
	await logAdminAction(admin.id, 'UPDATE_SETTINGS', undefined, { changes })

	revalidatePath('/admin/settings')
}

export async function updateCategory(formData: FormData) {
	const admin = await checkAdminAuth()

	const id = formData.get('id') as string
	const name = formData.get('name') as string

	if (!id || !name || name.trim().length < 2) {
		throw new Error('Nazwa kategorii musi mieć minimum 2 znaki')
	}

	const oldCategory = await prisma.category.findUnique({
		where: { id },
		select: { name: true },
	})

	await prisma.category.update({
		where: { id },
		data: {
			name: name.trim(),
			slug: name
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-'),
		},
	})

	// Audit log
	await logAdminAction(admin.id, 'UPDATE_CATEGORY', id, {
		oldName: oldCategory?.name,
		newName: name.trim(),
	})

	revalidatePath('/admin/categories')
}

// --- ZARZĄDZANIE FIRMAMI ---

export async function deleteCompany(companyId: string) {
	const admin = await checkAdminAuth()

	const company = await prisma.company.findUnique({
		where: { id: companyId },
		select: { name: true, nip: true },
	})

	if (!company) throw new Error('Firma nie istnieje')

	// Usuń powiązane dane
	await prisma.$transaction([
		prisma.lead.deleteMany({ where: { companyId } }),
		prisma.review.deleteMany({ where: { companyId } }),
		prisma.claimRequest.deleteMany({ where: { companyId } }),
		prisma.companyUser.deleteMany({ where: { companyId } }),
		prisma.company.delete({ where: { id: companyId } }),
	])

	// Audit log
	await logAdminAction(admin.id, 'DELETE_COMPANY', companyId, {
		name: company.name,
		nip: company.nip,
	})

	revalidatePath('/admin/companies')
}

export async function verifyCompany(companyId: string) {
	const admin = await checkAdminAuth()

	const company = await prisma.company.findUnique({
		where: { id: companyId },
		select: { name: true, isVerified: true },
	})

	if (!company) throw new Error('Firma nie istnieje')

	await prisma.company.update({
		where: { id: companyId },
		data: { isVerified: !company.isVerified },
	})

	// Audit log
	await logAdminAction(admin.id, company.isVerified ? 'UNVERIFY_COMPANY' : 'VERIFY_COMPANY', companyId, {
		name: company.name,
	})

	revalidatePath('/admin/companies')
}

export async function setCompanyPremium(companyId: string, isPremium: boolean) {
	const admin = await checkAdminAuth()

	const company = await prisma.company.findUnique({
		where: { id: companyId },
		select: { name: true },
	})

	if (!company) throw new Error('Firma nie istnieje')

	await prisma.company.update({
		where: { id: companyId },
		data: {
			plan: isPremium ? 'PREMIUM' : 'FREE',
			premiumUntil: isPremium ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
		},
	})

	// Audit log
	await logAdminAction(admin.id, isPremium ? 'SET_PREMIUM' : 'REMOVE_PREMIUM', companyId, {
		name: company.name,
	})

	revalidatePath('/admin/companies')
}
