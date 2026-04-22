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
	TrendingUp,
	ExternalLink,
	ChevronRight,
	ChevronDown,
	Eye,
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

type Tab = 'edit' | 'premium' | 'password'

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
	const [activeTab, setActiveTab] = useState<Tab>('edit')
	const [showClaimForm, setShowClaimForm] = useState(false)
	const [isCompanyListOpen, setIsCompanyListOpen] = useState(!selectedCompany)

	const isPremium = selectedCompany?.plan === 'PREMIUM'
	const isPremiumActive =
		isPremium && (!selectedCompany?.premiumUntil || new Date(selectedCompany.premiumUntil) > new Date())

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
			router.refresh()
			setClaimSlug('')
		} catch (error: any) {
			if (error && typeof error === 'object' && 'digest' in error) {
				throw error
			}
			alert(error.message || 'Wystąpił błąd podczas przejmowania firmy')
			setClaimingCompany(false)
		}
	}

	return (
		<div className='max-w-7xl mx-auto'>
			{/* Status messages */}
			{(status || error) && (
				<div className='mb-6 space-y-3'>
					{status === 'password_updated' && (
						<div className='bg-green-50 border border-green-200 text-green-700 px-5 py-3.5 rounded-xl flex items-center gap-3'>
							<CheckCircle2 size={18} />
							<p className='font-semibold text-sm'>Hasło zostało zaktualizowane</p>
						</div>
					)}
					{status === 'claimed_successfully' && (
						<div className='bg-green-50 border border-green-200 text-green-700 px-5 py-3.5 rounded-xl flex items-center gap-3'>
							<CheckCircle2 size={18} />
							<p className='font-semibold text-sm'>Firma została pomyślnie przejęta!</p>
						</div>
					)}
					{status === 'company_added' && (
						<div className='bg-green-50 border border-green-200 text-green-700 px-5 py-3.5 rounded-xl flex items-center gap-3'>
							<CheckCircle2 size={18} />
							<p className='font-semibold text-sm'>Nowa firma została dodana do Twojego konta!</p>
						</div>
					)}
					{error && (
						<div className='bg-red-50 border border-red-200 text-red-700 px-5 py-3.5 rounded-xl flex items-center gap-3'>
							<AlertCircle size={18} />
							<p className='font-semibold text-sm'>
								{error === 'wrong_old_password' && 'Obecne hasło jest nieprawidłowe'}
								{error === 'password_too_short' && 'Nowe hasło musi mieć min. 8 znaków'}
								{error === 'passwords_not_matching' && 'Podane hasła nie są identyczne'}
							</p>
						</div>
					)}
				</div>
			)}

			{/* Header */}
			<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
				<div>
					<h1 className='text-2xl font-bold text-gray-900'>Panel zarządzania</h1>
					<p className='text-gray-500 text-sm mt-0.5'>{user.email}</p>
				</div>
				<form action={logoutAction}>
					<button className='flex items-center gap-2 text-gray-500 hover:text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-all text-sm font-medium'>
						<LogOut size={16} /> Wyloguj
					</button>
				</form>
			</div>

			<div className='grid lg:grid-cols-[320px_1fr] gap-6'>
				{/* ===== LEFT SIDEBAR ===== */}
				<div className='space-y-4'>
					{/* Company list */}
					<div className='bg-white rounded-2xl border border-gray-200 shadow-sm'>
						<div 
							className='p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors rounded-t-2xl'
							onClick={() => setIsCompanyListOpen(!isCompanyListOpen)}
						>
							<div className='flex items-center justify-between'>
								<h2 className='text-sm font-semibold text-gray-900 flex items-center gap-2'>
									Twoje firmy
									<ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isCompanyListOpen ? 'rotate-180' : ''}`} />
								</h2>
								<Link
									href='/dodaj-firme'
									className='flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors'
									onClick={(e) => e.stopPropagation()}
								>
									<Plus size={14} /> Dodaj
								</Link>
							</div>
						</div>

						<div className={`transition-all duration-200 overflow-hidden ${isCompanyListOpen ? 'opacity-100' : 'max-h-0 opacity-0'}`}>
							<div className='p-2 max-h-[350px] overflow-y-auto custom-scrollbar'>
								{companies.length > 0 ? (
									<div className='space-y-1'>
										{companies.map(company => {
											const isSelected = selectedCompany?.id === company.id
											const companyPremiumActive =
												company.plan === 'PREMIUM' &&
												(!company.premiumUntil || new Date(company.premiumUntil) > new Date())
											return (
												<Link
													key={company.id}
													href={`/dashboard?companyId=${company.id}`}
													className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
														isSelected
															? 'bg-blue-50 border border-blue-200'
															: 'hover:bg-gray-50 border border-transparent'
													}`}
												>
													<div
														className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
															companyPremiumActive
																? 'bg-gradient-to-br from-amber-400 to-orange-500'
																: 'bg-gray-100'
														}`}
													>
														{companyPremiumActive ? (
															<Crown size={18} className='text-white' />
														) : (
															<Building2 size={18} className='text-gray-400' />
														)}
													</div>
													<div className='min-w-0 flex-1 overflow-hidden'>
														<p
															className={`text-sm font-semibold truncate ${
																isSelected ? 'text-blue-700' : 'text-gray-900'
															}`}
															title={company.name}
														>
															{company.name}
														</p>
														<p className='text-xs text-gray-500 truncate' title={company.category.name}>{company.category.name}</p>
													</div>
													{isSelected && (
														<ChevronRight size={16} className='text-blue-400 flex-shrink-0' />
													)}
												</Link>
											)
										})}
									</div>
								) : (
									<div className='p-6 text-center'>
										<Building2 size={32} className='text-gray-300 mx-auto mb-3' />
										<p className='text-sm text-gray-500 mb-3'>Brak firm</p>
										<Link
											href='/dodaj-firme'
											className='inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700'
										>
											<Plus size={14} /> Dodaj pierwszą firmę
										</Link>
									</div>
								)}
							</div>
						</div>

						{/* Claim section */}
						<div className='border-t border-gray-100 p-3'>
							{showClaimForm ? (
								<form onSubmit={handleClaimCompany} className='space-y-2'>
									<input
										type='text'
										value={claimSlug}
										onChange={e => setClaimSlug(e.target.value)}
										placeholder='Nazwa firmy...'
										className='w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
									/>
									<div className='flex gap-2'>
										<button
											type='submit'
											disabled={claimingCompany || !claimSlug.trim()}
											className='flex-1 px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-black transition-colors'
										>
											{claimingCompany ? 'Przetwarzanie...' : 'Przejmij'}
										</button>
										<button
											type='button'
											onClick={() => {
												setShowClaimForm(false)
												setClaimSlug('')
											}}
											className='px-3 py-2 text-gray-500 hover:text-gray-700 text-xs font-medium'
										>
											Anuluj
										</button>
									</div>
									<p className='text-[11px] text-gray-400 leading-tight'>
										Zgłoszenie wymaga weryfikacji administratora.
									</p>
								</form>
							) : (
								<button
									onClick={() => setShowClaimForm(true)}
									className='flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors'
								>
									<Search size={14} />
									<span className='font-medium'>Przejmij istniejącą firmę</span>
								</button>
							)}
						</div>
					</div>

					{/* Stats card - only when company selected */}
					{selectedCompany && (
						<div className='bg-white rounded-2xl border border-gray-200 shadow-sm p-4'>
							<h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4'>
								Statystyki
							</h3>
							<div className='space-y-3'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2.5'>
										<div className='w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center'>
											<ShieldCheck size={15} className='text-green-600' />
										</div>
										<span className='text-sm text-gray-600'>Status</span>
									</div>
									<span
										className={`text-xs font-semibold px-2 py-1 rounded-full ${
											selectedCompany.isVerified
												? 'bg-green-50 text-green-700'
												: 'bg-amber-50 text-amber-700'
										}`}
									>
										{selectedCompany.isVerified ? 'Zweryfikowany' : 'W trakcie'}
									</span>
								</div>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2.5'>
										<div className='w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center'>
											<Eye size={15} className='text-blue-600' />
										</div>
										<span className='text-sm text-gray-600'>Odsłonięcia</span>
									</div>
									<span className='text-sm font-bold text-gray-900'>
										{selectedCompany._count.leads}
									</span>
								</div>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2.5'>
										<div className='w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center'>
											<Star size={15} className='text-amber-600' />
										</div>
										<span className='text-sm text-gray-600'>Opinie</span>
									</div>
									<span className='text-sm font-bold text-gray-900'>
										{selectedCompany._count.reviews}
									</span>
								</div>
							</div>
							<div className='mt-4 pt-3 border-t border-gray-100'>
								<Link
									href={`/firma/${selectedCompany.slug}`}
									target='_blank'
									className='flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors'
								>
									Profil publiczny <ExternalLink size={13} />
								</Link>
							</div>
						</div>
					)}

					{/* Premium card */}
					{selectedCompany && (
						<div
							className={`rounded-2xl border shadow-sm p-4 ${
								isPremiumActive
									? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
									: 'bg-white border-gray-200'
							}`}
						>
							<div className='flex items-center gap-3 mb-3'>
								<div
									className={`w-9 h-9 rounded-lg flex items-center justify-center ${
										isPremiumActive
											? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
											: 'bg-gray-100 text-gray-400'
									}`}
								>
									<Crown size={18} />
								</div>
								<div>
									<p className='text-sm font-bold text-gray-900'>
										{isPremiumActive ? 'Premium' : 'Plan FREE'}
									</p>
									{isPremium && selectedCompany.premiumUntil && (
										<p className='text-[11px] text-gray-500 flex items-center gap-1'>
											<Calendar size={10} />
											do {new Date(selectedCompany.premiumUntil).toLocaleDateString('pl-PL')}
										</p>
									)}
								</div>
							</div>

							{isPremiumActive && selectedCompany.stripeCustomerId ? (
								<button
									onClick={handleManageSubscription}
									disabled={managingSubscription}
									className='w-full bg-white border border-amber-200 text-gray-800 px-3 py-2 rounded-lg font-semibold text-xs hover:bg-amber-50 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50'
								>
									<Settings size={13} />
									{managingSubscription ? 'Ładowanie...' : 'Zarządzaj planem'}
								</button>
							) : isPremiumActive ? (
								<div className='text-xs text-gray-600 text-center p-2 bg-amber-100/50 rounded-lg'>
									Aktywne (jednorazowa płatność)
								</div>
							) : (
								<button
									onClick={handleUpgradeToPremium}
									disabled={upgradingToPremium}
									className='w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-2.5 rounded-lg font-bold text-xs hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50'
								>
									<Sparkles size={13} />
									{upgradingToPremium ? 'Ładowanie...' : 'Wykup Premium'}
								</button>
							)}
						</div>
					)}
				</div>

				{/* ===== MAIN CONTENT ===== */}
				<div>
					{selectedCompany ? (
						<div className='space-y-6'>
							{/* Tabs */}
							<div className='bg-white rounded-2xl border border-gray-200 shadow-sm'>
								<div className='flex border-b border-gray-100'>
									<button
										onClick={() => setActiveTab('edit')}
										className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors relative ${
											activeTab === 'edit'
												? 'text-blue-600'
												: 'text-gray-500 hover:text-gray-700'
										}`}
									>
										<Building2 size={16} />
										Dane wizytówki
										{activeTab === 'edit' && (
											<span className='absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full' />
										)}
									</button>
									{isPremiumActive && (
										<button
											onClick={() => setActiveTab('premium')}
											className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors relative ${
												activeTab === 'premium'
													? 'text-amber-600'
													: 'text-gray-500 hover:text-gray-700'
											}`}
										>
											<Crown size={16} />
											Funkcje Premium
											{activeTab === 'premium' && (
												<span className='absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full' />
											)}
										</button>
									)}
									<button
										onClick={() => setActiveTab('password')}
										className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors relative ${
											activeTab === 'password'
												? 'text-blue-600'
												: 'text-gray-500 hover:text-gray-700'
										}`}
									>
										<KeyRound size={16} />
										Hasło
										{activeTab === 'password' && (
											<span className='absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full' />
										)}
									</button>
								</div>

								<div className='p-6'>
									{/* Edit tab */}
									{activeTab === 'edit' && (
										<EditCompanyForm company={selectedCompany as any} />
									)}

									{/* Premium tab */}
									{activeTab === 'premium' && isPremiumActive && (
										<div>
											<p className='text-sm text-gray-500 mb-6'>
												Wykorzystaj wszystkie możliwości pakietu Premium.
											</p>
											<div className='space-y-3'>
												<PremiumFeatureCard
													icon={<Link2 size={18} />}
													title='Dodatkowe podstrony'
													desc='Oferta, Kontakt, Usługi'
													action='Zarządzaj'
													href={`/dashboard/premium/pages?companyId=${selectedCompany.id}`}
												/>
												<PremiumFeatureCard
													icon={<FileText size={18} />}
													title='Artykuły blogowe'
													desc='2 artykuły z promocją'
													action='Dodaj artykuł'
													href={`/dashboard/premium/articles?companyId=${selectedCompany.id}`}
												/>
												<PremiumFeatureCard
													icon={<BarChart3 size={18} />}
													title='Raport roczny'
													desc='Statystyki i analityka'
													action='Zobacz raport'
													href={`/dashboard/premium/report?companyId=${selectedCompany.id}`}
												/>
												<PremiumFeatureCard
													icon={<TrendingUp size={18} />}
													title='Top kategorii'
													desc='Wyróżnienie na 30 dni'
													action='Sprawdź status'
													href={`/dashboard/premium/top?companyId=${selectedCompany.id}`}
												/>
											</div>
										</div>
									)}

									{/* Password tab */}
									{activeTab === 'password' && (
										<div>
											<p className='text-sm text-gray-500 mb-6'>
												Zmień hasło dostępu do panelu zarządzania.
											</p>
											<form action={changePasswordAction} className='max-w-lg space-y-4'>
												<div>
													<label className='block text-sm font-medium text-gray-700 mb-1.5'>
														Obecne hasło
													</label>
													<div className='relative'>
														<Lock
															className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'
															size={16}
														/>
														<input
															name='oldPassword'
															type='password'
															required
															className='w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm'
														/>
													</div>
												</div>
												<div>
													<label className='block text-sm font-medium text-gray-700 mb-1.5'>
														Nowe hasło
													</label>
													<div className='relative'>
														<Lock
															className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'
															size={16}
														/>
														<input
															name='newPassword'
															type='password'
															required
															placeholder='Min. 8 znaków'
															className='w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm'
														/>
													</div>
												</div>
												<div>
													<label className='block text-sm font-medium text-gray-700 mb-1.5'>
														Powtórz nowe hasło
													</label>
													<div className='relative'>
														<Lock
															className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'
															size={16}
														/>
														<input
															name='confirmPassword'
															type='password'
															required
															className='w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm'
														/>
													</div>
												</div>
												<button className='bg-gray-900 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-black transition-all flex items-center gap-2 text-sm mt-2'>
													Zmień hasło
													<ArrowRight size={15} />
												</button>
											</form>
										</div>
									)}
								</div>
							</div>
						</div>
					) : (
						<div className='bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center'>
							<Building2 size={48} className='text-gray-300 mx-auto mb-4' />
							<h3 className='text-lg font-bold text-gray-900 mb-2'>Wybierz firmę do zarządzania</h3>
							<p className='text-gray-500 text-sm mb-6'>
								Wybierz firmę z listy po lewej lub dodaj nową.
							</p>
							<Link
								href='/dodaj-firme'
								className='inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-all font-semibold text-sm'
							>
								<Plus size={16} /> Dodaj firmę
							</Link>
						</div>
					)}
				</div>
			</div>
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
			className='flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50/30 transition-all group'
		>
			<div className='w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center text-white flex-shrink-0 group-hover:scale-105 transition-transform'>
				{icon}
			</div>
			<div className='flex-1 min-w-0'>
				<h3 className='font-semibold text-gray-900 text-sm'>{title}</h3>
				<p className='text-xs text-gray-500'>{desc}</p>
			</div>
			<span className='text-xs font-semibold text-blue-600 group-hover:text-blue-700 flex items-center gap-1 flex-shrink-0 whitespace-nowrap'>
				{action} <ArrowRight size={12} className='group-hover:translate-x-0.5 transition-transform' />
			</span>
		</Link>
	)
}
