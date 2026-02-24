'use client'

import { useState } from 'react'
import { EditCompanyForm } from '@/components/EditCompanyForm'
import { logoutAction, changePasswordAction } from '@/actions/authActions'
import { claimCompanyAction } from '@/actions/claimCompany'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
	Building2,
	LogOut,
	Phone,
	Star,
	KeyRound,
	Lock,
	ShieldCheck,
	CheckCircle2,
	AlertCircle,
	ArrowRight,
	Crown,
	Calendar,
	Settings,
	Sparkles,
	Plus,
	Search,
	FileText,
	Link2,
	BarChart3,
	BookOpen,
	TrendingUp,
	ExternalLink,
} from 'lucide-react'

type CompanyWithStats = {
	id: string
	name: string
	slug: string
	plan: 'FREE' | 'PREMIUM'
	premiumUntil: Date | null
	isVerified: boolean
	stripeCustomerId: string | null
	stripeSubscriptionId: string | null
	category: {
		name: string
	}
	_count: {
		reviews: number
		leads: number
	}
}

interface DashboardContentProps {
	user: {
		id: string
		email: string
	}
	companies: CompanyWithStats[]
	selectedCompany: CompanyWithStats | null
	phoneReveals: number
	reviewCount: number
	status?: string
	error?: string
}

export function DashboardContent({
	user,
	companies,
	selectedCompany,
	phoneReveals,
	reviewCount,
	status,
	error,
}: DashboardContentProps) {
	const router = useRouter()
	const [managingSubscription, setManagingSubscription] = useState(false)
	const [upgradingToPremium, setUpgradingToPremium] = useState(false)
	const [claimingCompany, setClaimingCompany] = useState(false)
	const [claimSlug, setClaimSlug] = useState('')

	const isPremium = selectedCompany?.plan === 'PREMIUM'
	const premiumExpired =
		isPremium && selectedCompany?.premiumUntil ? new Date(selectedCompany.premiumUntil) < new Date() : false

	async function handleManageSubscription() {
		if (!selectedCompany) return
		try {
			setManagingSubscription(true)
			const response = await fetch('/api/customer-portal', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ companyId: selectedCompany.id }),
			})
			const data = await response.json()
			if (data.url) window.location.href = data.url
		} catch (error) {
			console.error('Error:', error)
			alert('Wystąpił błąd. Spróbuj ponownie.')
		} finally {
			setManagingSubscription(false)
		}
	}

	async function handleUpgradeToPremium() {
		if (!selectedCompany) {
			alert('Wybierz firmę, dla której chcesz wykupić Premium')
			return
		}
		try {
			setUpgradingToPremium(true)
			window.location.href = `/checkout?companyId=${selectedCompany.id}`
		} catch (error) {
			console.error('Error:', error)
			alert('Wystąpił błąd. Spróbuj ponownie.')
		} finally {
			setUpgradingToPremium(false)
		}
	}

	async function handleClaimCompany(e: React.FormEvent) {
		e.preventDefault()
		if (!claimSlug.trim()) {
			alert('Wprowadź slug firmy')
			return
		}
		try {
			setClaimingCompany(true)
			const formData = new FormData()
			formData.append('companySlug', claimSlug.trim())
			await claimCompanyAction(formData)
			// If we reach here, redirect was not called (shouldn't happen)
			// But if it does, refresh the page
			router.refresh()
			setClaimSlug('')
		} catch (error: any) {
			// Next.js redirect() throws a RedirectError internally
			// We need to check if this is a redirect error and let it propagate
			if (error && typeof error === 'object' && 'digest' in error) {
				// This is likely a Next.js redirect error - let it propagate
				// The redirect will happen automatically
				throw error
			}
			// For other errors, show the error message
			alert(error.message || 'Wystąpił błąd podczas przejmowania firmy')
			setClaimingCompany(false)
		}
	}

	return (
		<div className='max-w-6xl mx-auto space-y-6'>
			{/* Komunikaty */}
			{(status || error) && (
				<div className='space-y-3'>
					{status === 'password_updated' && (
						<div className='bg-green-50 border border-green-200 text-green-700 px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-sm'>
							<CheckCircle2 size={18} />
							<p className='font-bold text-sm'>Hasło zostało zaktualizowane</p>
						</div>
					)}
					{status === 'claimed_successfully' && (
						<div className='bg-green-50 border border-green-200 text-green-700 px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-sm'>
							<CheckCircle2 size={18} />
							<p className='font-bold text-sm'>Firma została pomyślnie przejęta!</p>
						</div>
					)}
					{status === 'company_added' && (
						<div className='bg-green-50 border border-green-200 text-green-700 px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-sm'>
							<CheckCircle2 size={18} />
							<p className='font-bold text-sm'>Nowa firma została dodana do Twojego konta!</p>
						</div>
					)}
					{error && (
						<div className='bg-red-50 border border-red-200 text-red-700 px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-sm'>
							<AlertCircle size={18} />
							<p className='font-bold text-sm'>
								{error === 'wrong_old_password' && 'Obecne hasło jest nieprawidłowe'}
								{error === 'password_too_short' && 'Nowe hasło musi mieć min. 8 znaków'}
								{error === 'passwords_not_matching' && 'Podane hasła nie są identyczne'}
							</p>
						</div>
					)}
				</div>
			)}

			{/* Header */}
			<div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
				<div>
					<h1 className='text-3xl font-black text-gray-900'>Witaj, {user.email}</h1>
					<p className='text-gray-500 font-medium text-sm'>Zarządzaj swoimi firmami</p>
				</div>
				<form action={logoutAction}>
					<button className='flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm shadow-sm'>
						<LogOut size={16} /> Wyloguj
					</button>
				</form>
			</div>

			{/* Lista firm */}
			<div className='bg-white p-8 rounded-3xl border border-gray-100 shadow-sm'>
				<div className='flex items-center justify-between mb-6'>
					<div>
						<h2 className='text-xl font-black text-gray-900 flex items-center gap-2'>
							<Building2 size={24} /> Twoje firmy
						</h2>
						<p className='text-gray-500 text-sm mt-1'>Wybierz firmę do zarządzania</p>
					</div>
					<Link
						href='/dodaj-firme'
						className='flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all font-bold text-sm'
					>
						<Plus size={16} /> Dodaj firmę
					</Link>
				</div>

				{companies.length > 0 ? (
					<div className='space-y-3 mb-6'>
						{companies.map(company => (
							<Link
								key={company.id}
								href={`/dashboard?companyId=${company.id}`}
								className={`block p-4 rounded-xl border-2 transition-all ${
									selectedCompany?.id === company.id
										? 'border-blue-500 bg-blue-50'
										: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
								}`}
							>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-4'>
										<div
											className={`w-12 h-12 rounded-xl flex items-center justify-center ${
												company.plan === 'PREMIUM' &&
												company.premiumUntil &&
												new Date(company.premiumUntil) > new Date()
													? 'bg-gradient-to-br from-amber-400 to-orange-500'
													: 'bg-gray-100'
											}`}
										>
											{company.plan === 'PREMIUM' &&
											company.premiumUntil &&
											new Date(company.premiumUntil) > new Date() ? (
												<Crown size={24} className='text-white' />
											) : (
												<Building2 size={24} className='text-gray-400' />
											)}
										</div>
										<div>
											<h3 className='font-black text-gray-900'>{company.name}</h3>
											<p className='text-sm text-gray-500'>{company.category.name}</p>
										</div>
									</div>
									<div className='flex items-center gap-4'>
										<div className='text-right'>
											<p className='text-xs text-gray-500'>Opinie</p>
											<p className='font-bold text-gray-900'>{company._count.reviews}</p>
										</div>
										<ArrowRight
											size={20}
											className={selectedCompany?.id === company.id ? 'text-blue-600' : 'text-gray-400'}
										/>
									</div>
								</div>
							</Link>
						))}
					</div>
				) : (
					<div className='text-center py-12 border-2 border-dashed border-gray-200 rounded-xl mb-6'>
						<Building2 size={48} className='text-gray-300 mx-auto mb-4' />
						<p className='text-gray-500 font-medium mb-4'>Nie masz jeszcze żadnych firm</p>
						<Link
							href='/dodaj-firme'
							className='inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all font-bold'
						>
							<Plus size={16} /> Dodaj pierwszą firmę
						</Link>
					</div>
				)}

				{/* Claimowanie firmy */}
				<div className='border-t border-gray-100 pt-6'>
					<h3 className='font-bold text-gray-900 mb-3 flex items-center gap-2'>
						<Search size={18} /> Przejmij istniejącą firmę
					</h3>
					<form onSubmit={handleClaimCompany} className='flex gap-3'>
						<input
							type='text'
							value={claimSlug}
							onChange={e => setClaimSlug(e.target.value)}
							placeholder='Wprowadź nazwę firmy'
							className='flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
						/>
						<button
							type='submit'
							disabled={claimingCompany || !claimSlug.trim()}
							className='px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed'
						>
							{claimingCompany ? 'Przetwarzanie...' : 'Przejmij'}
						</button>
					</form>
					<p className='text-xs text-gray-500 mt-2'>
						Wprowadź slug firmy, którą chcesz przejąć. Zgłoszenie będzie wymagało weryfikacji administratora.
					</p>
				</div>
			</div>

			{/* Wybrana firma - szczegóły */}
			{selectedCompany ? (
				<>
					{/* Premium Status & Stats */}
					<div className='grid lg:grid-cols-3 gap-6'>
						{/* Lewa kolumna - Premium & Stats */}
						<div className='lg:col-span-1 space-y-6'>
							{/* Premium Card */}
							<div
								className={`p-6 rounded-3xl border-2 shadow-sm ${
									isPremium && !premiumExpired
										? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
										: 'bg-white border-gray-200'
								}`}
							>
								<div className='flex items-center gap-3 mb-4'>
									<div
										className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
											isPremium && !premiumExpired
												? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
												: 'bg-gray-100 text-gray-400'
										}`}
									>
										<Crown size={20} />
									</div>
									<div>
										<p className='font-black text-gray-900 text-lg'>
											{isPremium && !premiumExpired ? 'Premium' : 'Plan FREE'}
										</p>
										{isPremium && selectedCompany.premiumUntil && (
											<p className='text-xs text-gray-600 font-medium flex items-center gap-1.5'>
												<Calendar size={12} />
												Ważny do {new Date(selectedCompany.premiumUntil).toLocaleDateString('pl-PL')}
											</p>
										)}
									</div>
								</div>

								{isPremium && !premiumExpired && selectedCompany.stripeCustomerId ? (
									<button
										onClick={handleManageSubscription}
										disabled={managingSubscription}
										className='w-full bg-white border-2 border-amber-200 text-gray-900 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-amber-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50'
									>
										<Settings size={16} />
										{managingSubscription ? 'Ładowanie...' : 'Zarządzaj planem'}
									</button>
								) : isPremium && !premiumExpired ? (
									<div className='text-xs text-gray-600 text-center p-3 bg-amber-50 rounded-xl border border-amber-200'>
										Premium aktywne (jednorazowa płatność)
									</div>
								) : (
									<button
										onClick={handleUpgradeToPremium}
										disabled={upgradingToPremium}
										className='w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 rounded-xl font-black text-sm hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50'
									>
										<Sparkles size={16} />
										{upgradingToPremium ? 'Ładowanie...' : 'Wykup Premium'}
									</button>
								)}
							</div>

							{/* Stats */}
							<div className='bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-5'>
								<h3 className='font-black text-gray-900 text-sm uppercase tracking-wider flex items-center gap-2'>
									<ShieldCheck size={16} className='text-blue-500' /> Statystyki
								</h3>
								<div className='space-y-4'>
									<div className='flex items-center justify-between'>
										<div className='flex items-center gap-3'>
											<div className='w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center'>
												<ShieldCheck size={16} className='text-green-600' />
											</div>
											<span className='text-sm font-bold text-gray-600'>Status</span>
										</div>
										<span
											className={`text-sm font-black ${
												selectedCompany.isVerified ? 'text-green-600' : 'text-amber-600'
											}`}
										>
											{selectedCompany.isVerified ? 'Zweryfikowany' : 'W trakcie'}
										</span>
									</div>
									<div className='flex items-center justify-between'>
										<div className='flex items-center gap-3'>
											<div className='w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center'>
												<Phone size={16} className='text-blue-600' />
											</div>
											<span className='text-sm font-bold text-gray-600'>Odsłonięcia</span>
										</div>
										<span className='text-xl font-black text-gray-900'>{selectedCompany._count.leads}</span>
									</div>
									<div className='flex items-center justify-between'>
										<div className='flex items-center gap-3'>
											<div className='w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center'>
												<Star size={16} className='text-amber-600' />
											</div>
											<span className='text-sm font-bold text-gray-600'>Opinie</span>
										</div>
										<span className='text-xl font-black text-gray-900'>{selectedCompany._count.reviews}</span>
									</div>
								</div>
								<div className='pt-4 border-t border-gray-100'>
									<Link
										href={`/firma/${selectedCompany.slug}`}
										target='_blank'
										className='flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors'
									>
										Zobacz profil publiczny
										<ExternalLink size={14} />
									</Link>
								</div>
							</div>
						</div>

						{/* Prawa kolumna - Edycja */}
						<div className='lg:col-span-2'>
							<div className='bg-white p-8 rounded-3xl border border-gray-100 shadow-sm'>
								<div className='flex items-center gap-4 mb-6 pb-6 border-b border-gray-100'>
									<div className='w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center'>
										<Building2 size={24} />
									</div>
									<div>
										<h2 className='text-xl font-black text-gray-900'>Dane wizytówki</h2>
										<p className='text-gray-500 text-sm font-medium'>Edytuj dane kontaktowe i branżę</p>
									</div>
								</div>
								<EditCompanyForm company={selectedCompany as any} />
							</div>
						</div>
					</div>

					{/* Sekcja Premium - funkcje premium */}
					{isPremium && !premiumExpired && (
						<div className='bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 p-8 rounded-3xl shadow-sm'>
							<div className='flex items-center gap-4 mb-6'>
								<div className='w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center'>
									<Crown size={24} className='text-white' />
								</div>
								<div>
									<h2 className='text-xl font-black text-gray-900'>Funkcje Premium</h2>
									<p className='text-gray-600 text-sm'>Wykorzystaj wszystkie możliwości pakietu Pro</p>
								</div>
							</div>

							<div className='grid md:grid-cols-2 lg:grid-cols-4 gap-4'>
								<PremiumFeatureCard
									icon={<Link2 />}
									title='Dodatkowe podstrony'
									desc='Oferta, Kontakt, Usługi'
									action='Zarządzaj'
									href={`/dashboard/premium/pages?companyId=${selectedCompany.id}`}
								/>
								<PremiumFeatureCard
									icon={<FileText />}
									title='Artykuły blogowe'
									desc='2 artykuły z promocją'
									action='Dodaj artykuł'
									href={`/dashboard/premium/articles?companyId=${selectedCompany.id}`}
								/>
								<PremiumFeatureCard
									icon={<BarChart3 />}
									title='Raport roczny'
									desc='Statystyki i analityka'
									action='Zobacz raport'
									href={`/dashboard/premium/report?companyId=${selectedCompany.id}`}
								/>
								<PremiumFeatureCard
									icon={<TrendingUp />}
									title='Top kategorii'
									desc='Wyróżnienie na 30 dni'
									action='Sprawdź status'
									href={`/dashboard/premium/top?companyId=${selectedCompany.id}`}
								/>
							</div>
						</div>
					)}

					{/* Zmiana hasła */}
					<div className='bg-white p-8 rounded-3xl border border-gray-100 shadow-sm'>
						<div className='flex items-center gap-4 mb-6 pb-6 border-b border-gray-100'>
							<div className='w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center'>
								<KeyRound size={24} />
							</div>
							<div>
								<h2 className='text-xl font-black text-gray-900'>Zmiana hasła</h2>
								<p className='text-gray-500 text-sm font-medium'>Zabezpiecz dostęp do panelu</p>
							</div>
						</div>

						<form action={changePasswordAction} className='max-w-2xl'>
							<div className='grid md:grid-cols-3 gap-4 mb-6'>
								<div>
									<label className='block text-xs font-black text-gray-400 uppercase tracking-wider mb-2'>
										Obecne hasło
									</label>
									<div className='relative'>
										<Lock className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' size={16} />
										<input
											name='oldPassword'
											type='password'
											required
											className='w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm'
										/>
									</div>
								</div>
								<div>
									<label className='block text-xs font-black text-gray-400 uppercase tracking-wider mb-2'>
										Nowe hasło
									</label>
									<div className='relative'>
										<Lock className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' size={16} />
										<input
											name='newPassword'
											type='password'
											required
											placeholder='Min. 8 znaków'
											className='w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm'
										/>
									</div>
								</div>
								<div>
									<label className='block text-xs font-black text-gray-400 uppercase tracking-wider mb-2'>
										Powtórz hasło
									</label>
									<div className='relative'>
										<Lock className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' size={16} />
										<input
											name='confirmPassword'
											type='password'
											required
											className='w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm'
										/>
									</div>
								</div>
							</div>

							<button className='bg-gray-900 text-white px-8 py-3 rounded-xl font-black hover:bg-black transition-all shadow-lg active:scale-95 flex items-center gap-2 text-sm'>
								Zmień hasło
								<ArrowRight size={16} />
							</button>
						</form>
					</div>
				</>
			) : (
				<div className='bg-white p-12 rounded-3xl border-2 border-dashed border-gray-200 text-center'>
					<Building2 size={64} className='text-gray-300 mx-auto mb-4' />
					<h3 className='text-xl font-black text-gray-900 mb-2'>Wybierz firmę do zarządzania</h3>
					<p className='text-gray-500 mb-6'>Lub dodaj nową firmę, aby rozpocząć</p>
					<Link
						href='/dodaj-firme'
						className='inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all font-bold'
					>
						<Plus size={16} /> Dodaj firmę
					</Link>
				</div>
			)}
		</div>
	)
}

function PremiumFeatureCard({
	icon,
	title,
	desc,
	action,
	href,
}: {
	icon: React.ReactNode
	title: string
	desc: string
	action: string
	href: string
}) {
	return (
		<Link
			href={href}
			className='bg-white p-6 rounded-2xl border border-amber-200 hover:border-amber-300 hover:shadow-md transition-all group'
		>
			<div className='w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform'>
				{icon}
			</div>
			<h3 className='font-black text-gray-900 mb-1'>{title}</h3>
			<p className='text-xs text-gray-600 mb-4'>{desc}</p>
			<span className='text-sm font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-1'>
				{action} <ArrowRight size={14} className='group-hover:translate-x-1 transition-transform' />
			</span>
		</Link>
	)
}
