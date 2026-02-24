'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, AlertCircle, MapPin, Loader2 } from 'lucide-react'
import { CategorySearch } from '@/components/CategorySearch'
import { createCompanyAction } from '@/actions/addCompany'

interface Category {
	id: string
	name: string
}

interface FormState {
	error: string | null
	citySuggestions: string[]
}

export function AddCompanyForm({ categories }: { categories: Category[] }) {
	const router = useRouter()
	const [state, setState] = useState<FormState>({ error: null, citySuggestions: [] })
	const [isSubmitting, setIsSubmitting] = useState(false)
	const cityInputRef = useRef<HTMLInputElement>(null)
	const errorRef = useRef<HTMLDivElement>(null)

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		setState({ error: null, citySuggestions: [] })
		setIsSubmitting(true)

		try {
			const formData = new FormData(e.currentTarget)
			const result = await createCompanyAction(formData)

			if (!result.success) {
				setState({
					error: result.error,
					citySuggestions: result.citySuggestions || [],
				})
				setIsSubmitting(false)
				setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
				return
			}

			router.push(result.redirectUrl)
		} catch {
			setState({ error: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.', citySuggestions: [] })
			setIsSubmitting(false)
		}
	}

	function handleCitySuggestionClick(city: string) {
		if (cityInputRef.current) {
			cityInputRef.current.value = city
		}
		setState({ error: null, citySuggestions: [] })
	}

	return (
		<>
			{state.error && (
				<div ref={errorRef} className='mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-in fade-in'>
					<div className='flex items-start gap-3'>
						<AlertCircle className='text-red-500 shrink-0 mt-0.5' size={20} />
						<div className='flex-1'>
							<p className='text-red-700 font-medium text-sm'>{state.error}</p>

							{state.citySuggestions.length > 0 && (
								<div className='mt-3'>
									<p className='text-red-600 text-xs font-semibold mb-2'>
										Wybierz prawidłową miejscowość dla tego kodu pocztowego:
									</p>
									<div className='flex flex-wrap gap-2'>
										{state.citySuggestions.map(city => (
											<button
												key={city}
												type='button'
												onClick={() => handleCitySuggestionClick(city)}
												className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-sm text-red-700 hover:bg-red-100 hover:border-red-300 transition-colors font-medium cursor-pointer'
											>
												<MapPin size={14} />
												{city}
											</button>
										))}
									</div>
									<p className='text-red-500 text-xs mt-2'>
										Kliknij na miejscowość, aby ją wpisać w pole &ldquo;Miasto&rdquo;, a następnie wyślij formularz
										ponownie.
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			<form onSubmit={handleSubmit} className='space-y-5'>
				<div className='space-y-4'>
					<div>
						<label className='block text-sm font-semibold text-gray-700 mb-1.5 ml-1'>Nazwa firmy</label>
						<input
							name='name'
							required
							placeholder='np. Auto-Serwis Kowalski'
							className='w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white text-gray-900 font-medium shadow-sm'
						/>
					</div>

					<div>
						<label className='block text-sm font-semibold text-gray-700 mb-1.5 ml-1'>
							Branża <span className='text-red-500'>*</span>
						</label>
						<CategorySearch categories={categories} name='categoryId' required />
						<p className='text-xs text-gray-500 mt-1 ml-1'>
							Wpisz nazwę kategorii aby wyszukać ({categories.length} dostępnych)
						</p>
					</div>
				</div>

				<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
					<div>
						<label className='block text-sm font-semibold text-gray-700 mb-1.5 ml-1'>
							NIP <span className='text-red-500'>*</span>
						</label>
						<input
							name='nip'
							type='text'
							required
							maxLength={13}
							placeholder='1234567890'
							pattern='[0-9\-]{0,13}'
							className='w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white text-gray-900 font-medium shadow-sm'
							title='NIP musi składać się z 10 cyfr'
						/>
						<p className='text-xs text-gray-500 mt-1 ml-1'>10 cyfr (bez myślników) - zostanie zweryfikowany</p>
					</div>
					<div>
						<label className='block text-sm font-semibold text-gray-700 mb-1.5 ml-1'>
							Kod pocztowy <span className='text-red-500'>*</span>
						</label>
						<input
							name='zip'
							type='text'
							required
							maxLength={6}
							placeholder='00-000'
							pattern='[0-9]{2}-[0-9]{3}'
							className='w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white text-gray-900 font-medium shadow-sm'
							title='Format: XX-XXX (np. 00-001)'
						/>
						<p className='text-xs text-gray-500 mt-1 ml-1'>Format: XX-XXX</p>
					</div>
				</div>

				<div>
					<label className='block text-sm font-semibold text-gray-700 mb-1.5 ml-1'>
						Miasto <span className='text-red-500'>*</span>
					</label>
					<input
						ref={cityInputRef}
						name='city'
						required
						placeholder='np. Warszawa'
						className={`w-full px-4 py-3.5 rounded-xl border outline-none transition-all bg-white text-gray-900 font-medium shadow-sm ${
							state.citySuggestions.length > 0
								? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
								: 'border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
						}`}
					/>
					<p className='text-xs text-gray-500 mt-1 ml-1'>
						Miasto zostanie zweryfikowane na podstawie kodu pocztowego
					</p>
				</div>

				<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
					<div>
						<label className='block text-sm font-semibold text-gray-700 mb-1.5 ml-1'>
							Telefon <span className='text-red-500'>*</span>
						</label>
						<input
							name='phone'
							type='tel'
							required
							placeholder='+48 500 600 700'
							className='w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white text-gray-900 font-medium shadow-sm'
						/>
					</div>
					<div>
						<label className='block text-sm font-semibold text-gray-700 mb-1.5 ml-1'>
							Email (Login) <span className='text-red-500'>*</span>
						</label>
						<input
							name='email'
							type='email'
							required
							placeholder='kontakt@twojafirma.pl'
							className='w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white text-gray-900 font-medium shadow-sm'
						/>
					</div>
				</div>

				<div className='pt-4'>
					<button
						type='submit'
						disabled={isSubmitting}
						className='w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-xl flex justify-center items-center gap-3 group text-lg transform active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed'
					>
						{isSubmitting ? (
							<>
								<Loader2 size={20} className='animate-spin' />
								Rejestrowanie...
							</>
						) : (
							<>
								Zarejestruj firmę
								<ArrowRight size={20} className='text-gray-400 group-hover:text-white transition-colors' />
							</>
						)}
					</button>
				</div>
			</form>
		</>
	)
}
