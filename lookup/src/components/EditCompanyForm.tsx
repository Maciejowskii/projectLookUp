'use client'

import { updateCompanyAction } from '@/actions/updateCompany'
import { useState } from 'react'
import {
	Save,
	Globe,
	Phone,
	Mail,
	MapPin,
	AlignLeft,
	Image as ImageIcon,
	Crown,
	X,
	TrendingUp,
	ShieldCheck,
	Zap,
	Sparkles,
} from 'lucide-react'
import { OpeningHoursEditor, type OpeningHours } from './OpeningHoursEditor'
import { UploadButton } from '@/lib/uploadthing'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface CompanyData {
	id: string
	description: string | null
	website: string | null
	phone: string | null
	email: string | null
	address: string | null
	logo: string | null
	plan: 'FREE' | 'PREMIUM'
	premiumUntil: Date | null
	openingHours: OpeningHours | null
}

export function EditCompanyForm({ company }: { company: CompanyData }) {
	const router = useRouter()
	const [showUpsell, setShowUpsell] = useState(false)
	const [isProcessing, setIsProcessing] = useState(false)

	// Handler płatności Premium - UPROSZCZONA WERSJA
	async function handlePremiumUpgrade() {
		try {
			setIsProcessing(true)

			const response = await fetch('/api/checkout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					companyId: company.id,
				}),
			})

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}))
				throw new Error(errorData.error || 'Failed to create checkout session')
			}

			const { url } = await response.json()

			if (!url) {
				throw new Error('No checkout URL received')
			}

			// Proste przekierowanie przez window.location
			window.location.href = url
		} catch (error: any) {
			console.error('Payment error:', error)
			alert(error.message || 'Wystąpił błąd podczas inicjowania płatności.')
			setIsProcessing(false)
		}
	}

	async function handleSubmit(formData: FormData) {
		await updateCompanyAction(formData)

		// Pokazujemy upsell tylko jeśli firma nie jest Premium
		if (company.plan === 'FREE') {
			setShowUpsell(true)
		} else {
			router.refresh()
		}
	}

	// Sprawdzamy czy Premium jest aktywne
	const isPremiumActive =
		company.plan === 'PREMIUM' && company.premiumUntil && new Date(company.premiumUntil) > new Date()

	return (
		<div className='space-y-8'>
			{/* Badge Premium (jeśli aktywny) */}
			{isPremiumActive && (
				<div className='bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 p-5 rounded-2xl flex items-center justify-between'>
					<div className='flex items-center gap-3'>
						<div className='w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg'>
							<Crown className='text-white' size={24} />
						</div>
						<div>
							<p className='font-black text-gray-900 flex items-center gap-2'>
								Plan Premium Aktywny
								<Sparkles size={16} className='text-yellow-600' />
							</p>
							<p className='text-sm text-gray-600'>
								Ważny do: {new Date(company.premiumUntil!).toLocaleDateString('pl-PL')}
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Logo Firmy */}
			<div className='bg-white p-6 rounded-2xl border-2 border-gray-100'>
				<h3 className='text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2'>
					<ImageIcon size={16} className='text-blue-600' /> Logo Firmy
				</h3>
				<div className='flex items-center gap-6'>
					<div className='w-24 h-24 rounded-xl border-2 border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden relative'>
						{company.logo ? (
							<Image src={company.logo} alt='Logo' fill className='object-cover' />
						) : (
							<span className='text-gray-400 text-xs px-2'>Brak logo</span>
						)}
					</div>
					<div>
						<UploadButton
							endpoint='companyLogo'
							onClientUploadComplete={() => {
								router.refresh()
							}}
							onUploadError={err => alert(err.message)}
							appearance={{
								button: 'bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-sm',
								allowedContent: 'text-gray-400 text-xs',
							}}
						/>
					</div>
				</div>
			</div>

			{/* Modal Upsellingowy */}
			{showUpsell && (
				<div className='fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm'>
					<div className='bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in duration-300 border border-gray-100'>
						<button
							onClick={() => setShowUpsell(false)}
							className='absolute top-4 right-4 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors'
						>
							<X size={20} />
						</button>

						<div className='w-20 h-20 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ring-4 ring-white'>
							<Crown className='text-yellow-600' size={40} strokeWidth={2.5} />
						</div>

						<h2 className='text-2xl font-black text-center text-gray-900 mb-3'>Zmiany zapisane!</h2>

						<p className='text-center text-gray-500 mb-8 leading-relaxed'>
							Twoja wizytówka jest aktualna. <br />
							Chcesz zdobywać <strong className='text-gray-900'>3x więcej klientów?</strong>
						</p>

						<div className='bg-gray-50 p-5 rounded-2xl mb-8 space-y-4 border border-gray-100'>
							<div className='flex items-center gap-3'>
								<div className='bg-blue-100 p-1.5 rounded-lg text-blue-600'>
									<TrendingUp size={18} strokeWidth={3} />
								</div>
								<span className='text-gray-700 font-medium text-sm'>Priorytet w wynikach wyszukiwania</span>
							</div>

							<div className='flex items-center gap-3'>
								<div className='bg-yellow-100 p-1.5 rounded-lg text-yellow-600'>
									<ShieldCheck size={18} strokeWidth={3} />
								</div>
								<span className='text-gray-700 font-medium text-sm'>Złota ramka i odznaka Premium</span>
							</div>

							<div className='flex items-center gap-3'>
								<div className='bg-green-100 p-1.5 rounded-lg text-green-600'>
									<Zap size={18} strokeWidth={3} />
								</div>
								<span className='text-gray-700 font-medium text-sm'>Brak reklam konkurencji na profilu</span>
							</div>
						</div>

						<button
							onClick={handlePremiumUpgrade}
							disabled={isProcessing}
							className='w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group mb-3'
						>
							{isProcessing ? (
								<>
									<div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
									<span>Przekierowywanie...</span>
								</>
							) : (
								<>
									<span>Odblokuj Premium (99 zł/msc)</span>
									<Crown size={18} className='text-yellow-400 group-hover:scale-110 transition-transform' />
								</>
							)}
						</button>

						<button
							onClick={() => setShowUpsell(false)}
							className='w-full py-2 text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors'
						>
							Może później
						</button>
					</div>
				</div>
			)}

			{/* Formularz */}
			<form action={handleSubmit} className='space-y-8'>
				<input type='hidden' name='companyId' value={company.id} />
				<div className='space-y-4'>
					<label className='flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wide'>
						<AlignLeft size={16} className='text-blue-600' /> O firmie
					</label>
					<div className='relative'>
						<textarea
							name='description'
							defaultValue={company.description || ''}
							rows={6}
							className='w-full p-4 rounded-xl border-2 border-gray-100 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-y font-medium text-base shadow-sm'
							placeholder='Napisz czym się zajmujesz...'
						/>
					</div>
				</div>

				<div className='w-full h-px bg-gray-100 my-8'></div>

				<div>
					<h3 className='text-sm font-bold text-gray-900 uppercase tracking-wide mb-6 flex items-center gap-2'>
						Kontakt i Adres
					</h3>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
						<div className='space-y-2'>
							<label className='text-sm font-semibold text-gray-700'>Numer telefonu</label>
							<div className='relative group'>
								<Phone
									className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors'
									size={20}
								/>
								<input
									name='phone'
									type='text'
									defaultValue={company.phone || ''}
									className='w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-100 bg-white text-gray-900 font-medium placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm'
								/>
							</div>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-semibold text-gray-700'>Email</label>
							<div className='relative group'>
								<Mail
									className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors'
									size={20}
								/>
								<input
									name='email'
									type='text'
									defaultValue={company.email || ''}
									className='w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-100 bg-white text-gray-900 font-medium placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm'
								/>
							</div>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-semibold text-gray-700'>WWW</label>
							<div className='relative group'>
								<Globe
									className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors'
									size={20}
								/>
								<input
									name='website'
									type='text'
									defaultValue={company.website || ''}
									className='w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-100 bg-white text-gray-900 font-medium placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm'
								/>
							</div>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-semibold text-gray-700'>Adres</label>
							<div className='relative group'>
								<MapPin
									className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors'
									size={20}
								/>
								<input
									name='address'
									type='text'
									defaultValue={company.address || ''}
									className='w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-100 bg-white text-gray-900 font-medium placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm'
								/>
							</div>
						</div>
					</div>
				</div>

				<div className='w-full h-px bg-gray-100 my-8'></div>

				{/* Godziny otwarcia */}
				<OpeningHoursEditor 
					name='openingHours' 
					initialValue={company.openingHours} 
				/>

				<div className='pt-6 flex items-center justify-between border-t border-gray-100 mt-8'>
					<p className='text-sm text-gray-500 hidden md:block'>Pamiętaj, aby zapisywać zmiany regularnie.</p>
					<button
						type='submit'
						className='w-full md:w-auto bg-gray-900 text-white font-bold py-4 px-8 rounded-xl hover:bg-black transition-all shadow-xl shadow-gray-900/10 flex items-center justify-center gap-2 active:scale-95'
					>
						<Save size={20} /> Zapisz zmiany
					</button>
				</div>
			</form>
		</div>
	)
}
