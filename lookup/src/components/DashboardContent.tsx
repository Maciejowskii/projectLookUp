'use client'

import { useState } from 'react'
import { EditCompanyForm } from '@/components/EditCompanyForm'
import { logoutAction, changePasswordAction } from '@/actions/authActions'
import type { Company } from '@prisma/client'
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
} from 'lucide-react'

interface DashboardContentProps {
	user: {
		id: string
		email: string
		company: Company
		companyId: string
	}
	phoneReveals: number
	reviewCount: number
	status?: string
	error?: string
}

export function DashboardContent({ user, phoneReveals, reviewCount, status, error }: DashboardContentProps) {
	const [managingSubscription, setManagingSubscription] = useState(false)
	const [upgradingToPremium, setUpgradingToPremium] = useState(false)

	const isPremium = user.company.plan === 'PREMIUM'
	const premiumExpired =
		isPremium && user.company.premiumUntil ? new Date(user.company.premiumUntil) < new Date() : false

	async function handleManageSubscription() {
		try {
			setManagingSubscription(true)
			const response = await fetch('/api/customer-portal', { method: 'POST' })
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
		try {
			setUpgradingToPremium(true)
			const response = await fetch('/api/checkout', { method: 'POST' })
			const data = await response.json()
			if (data.url) window.location.href = data.url
		} catch (error) {
			console.error('Error:', error)
			alert('Wystąpił błąd. Spróbuj ponownie.')
		} finally {
			setUpgradingToPremium(false)
		}
	}

	return (
		<div className='max-w-6xl mx-auto'>
			{/* Komunikaty */}
			{(status || error) && (
				<div className='mb-6 space-y-3'>
					{status === 'password_updated' && (
						<div className='bg-green-50 border border-green-200 text-green-700 px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-sm'>
							<CheckCircle2 size={18} />
							<p className='font-bold text-sm'>Hasło zostało zaktualizowane</p>
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
			<div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8'>
				<div>
					<h1 className='text-3xl font-black text-gray-900'>Witaj, {user.company.name}</h1>
					<p className='text-gray-500 font-medium text-sm'>Panel zarządzania wizytówką</p>
				</div>
				<form action={logoutAction}>
					<button className='flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm shadow-sm'>
						<LogOut size={16} /> Wyloguj
					</button>
				</form>
			</div>

			{/* Grid Layout: Lewa kolumna (statystyki + premium) + Prawa kolumna (edycja) */}
			<div className='grid lg:grid-cols-3 gap-6 mb-6'>
				{/* Lewa kolumna - Statystyki i Premium */}
				<div className='lg:col-span-1 space-y-6'>
					{/* Premium Status Card */}
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
								{isPremium && user.company.premiumUntil && (
									<p className='text-xs text-gray-600 font-medium flex items-center gap-1.5'>
										<Calendar size={12} />
										Ważny do {new Date(user.company.premiumUntil).toLocaleDateString('pl-PL')}
									</p>
								)}
							</div>
						</div>

						{isPremium && !premiumExpired && user.company.stripeCustomerId ? (
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
								{upgradingToPremium ? 'Ładowanie...' : 'Wykup Premium - 99 PLN/rok'}
							</button>
						)}
					</div>

					{/* Statystyki - kompaktowe */}
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
								<span className={`text-sm font-black ${user.company.isVerified ? 'text-green-600' : 'text-amber-600'}`}>
									{user.company.isVerified ? 'Zweryfikowany' : 'W trakcie'}
								</span>
							</div>

							<div className='flex items-center justify-between'>
								<div className='flex items-center gap-3'>
									<div className='w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center'>
										<Phone size={16} className='text-blue-600' />
									</div>
									<span className='text-sm font-bold text-gray-600'>Odsłonięcia</span>
								</div>
								<span className='text-xl font-black text-gray-900'>{phoneReveals}</span>
							</div>

							<div className='flex items-center justify-between'>
								<div className='flex items-center gap-3'>
									<div className='w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center'>
										<Star size={16} className='text-amber-600' />
									</div>
									<span className='text-sm font-bold text-gray-600'>Opinie</span>
								</div>
								<span className='text-xl font-black text-gray-900'>{reviewCount}</span>
							</div>
						</div>
					</div>
				</div>

				{/* Prawa kolumna - Edycja firmy */}
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
						<EditCompanyForm company={user.company} />
					</div>
				</div>
			</div>

			{/* Zmiana hasła - pełna szerokość na dole */}
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
							<label className='block text-xs font-black text-gray-400 uppercase tracking-wider mb-2'>Nowe hasło</label>
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
		</div>
	)
}
