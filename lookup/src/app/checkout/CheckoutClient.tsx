'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function CheckoutClient() {
	const searchParams = useSearchParams()
	const [termsAccepted, setTermsAccepted] = useState(false)
	const [privacyAccepted, setPrivacyAccepted] = useState(false)
	const [canProceed, setCanProceed] = useState(false)
	const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'przelewy24'>('stripe')
	const [isProcessing, setIsProcessing] = useState(false)
	const companyId = searchParams.get('companyId')
	const error = searchParams.get('error')

	// Show error message if Przelewy24 is not implemented
	const showPrzelewy24Error = error === 'przelewy24_not_implemented'

	const handleTermsChange = (checked: boolean) => {
		setTermsAccepted(checked)
		setCanProceed(checked && privacyAccepted)
	}

	const handlePrivacyChange = (checked: boolean) => {
		setPrivacyAccepted(checked)
		setCanProceed(checked && termsAccepted)
	}

	const handleProceed = async () => {
		if (!canProceed) {
			alert('Musisz zaakceptować Regulamin i Politykę Prywatności, aby kontynuować.')
			return
		}
		// Store acceptance in sessionStorage
		sessionStorage.setItem('terms_accepted', 'true')
		sessionStorage.setItem('privacy_accepted', 'true')
		sessionStorage.setItem('terms_accepted_timestamp', new Date().toISOString())

		// Redirect to payment API (Stripe or Przelewy24)
		if (!companyId) {
			alert('Brak identyfikatora firmy. Wróć do dashboardu i wybierz firmę.')
			return
		}

		setIsProcessing(true)

		try {
			const response = await fetch('/api/checkout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					companyId: companyId,
					paymentMethod: selectedPaymentMethod,
				}),
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.error || 'Failed to create checkout session')
			}

			if (data.url) {
				// Redirect to payment provider (Stripe or Przelewy24)
				window.location.href = data.url
			} else if (data.error) {
				alert(`Błąd: ${data.error}`)
				setIsProcessing(false)
			}
		} catch (error: any) {
			console.error('Checkout error:', error)
			alert(error.message || 'Wystąpił błąd podczas inicjowania płatności. Spróbuj ponownie.')
			setIsProcessing(false)
		}
	}

	return (
		<div className='container mx-auto px-4 py-12 max-w-4xl'>
			<div className='bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100'>
				<h1 className='text-3xl font-extrabold text-gray-900 mb-8'>Finalizacja zamówienia</h1>

				{!companyId && (
					<div className='bg-red-50 border border-red-200 rounded-xl p-4 mb-6'>
						<p className='text-sm text-red-800'>
							<strong>Błąd:</strong> Brak identyfikatora firmy. Wróć do dashboardu i wybierz firmę.
						</p>
						<Link
							href='/dashboard'
							className='text-blue-600 hover:text-blue-700 font-bold text-sm mt-2 inline-block'
						>
							← Powrót do dashboardu
						</Link>
					</div>
				)}

				{showPrzelewy24Error && (
					<div className='bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6'>
						<p className='text-sm text-amber-800'>
							<strong>Uwaga:</strong> Integracja z Przelewy24 jest w trakcie wdrażania. Prosimy wybrać płatność kartą
							(Stripe) lub skontaktować się z nami.
						</p>
					</div>
				)}

				{showPrzelewy24Error && (
					<div className='bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6'>
						<p className='text-sm text-amber-800'>
							<strong>Uwaga:</strong> Integracja z Przelewy24 jest w trakcie wdrażania. Prosimy wybrać płatność kartą
							(Stripe) lub skontaktować się z nami.
						</p>
					</div>
				)}

				{/* Pre-checkout Information */}
				<div className='bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8'>
					<h2 className='text-xl font-bold text-gray-900 mb-4'>Informacje przed zamówieniem</h2>
					<div className='space-y-4 text-sm text-gray-700'>
						<div>
							<h3 className='font-semibold mb-2'>Dane sprzedawcy:</h3>
							<p>Jakub Wolert</p>
							<p>ul. Targowa 6/5, 72-010 Police</p>
							<p>NIP: 8513315629</p>
							<p>
								E-mail:{' '}
								<a href='mailto:kontakt@katalogo.pl' className='text-blue-600 underline'>
									kontakt@katalogo.pl
								</a>
							</p>
						</div>
						<div>
							<h3 className='font-semibold mb-2'>Usługa:</h3>
							<p className='font-bold text-gray-900 mb-2'>Pakiet Pro - pełny pakiet marketingowy</p>
							<ul className='text-xs text-gray-600 space-y-1 ml-4 list-disc'>
								<li>2-4 dodatkowe podstrony (Oferta, Kontakt, Usługi)</li>
								<li>Wyróżnienie "Rekomendowana firma" + wyższa pozycja</li>
								<li>Rozszerzony opis do 2000-3000 znaków</li>
								<li>Lead Box Premium (klikalny telefon, email, formularz)</li>
								<li>Pełna edycja przez cały okres</li>
								<li>Raport roczny z statystykami</li>
								<li>2 artykuły blogowe z 30-dniową promocją</li>
								<li>"Top kategorii" przez 30 dni</li>
							</ul>
						</div>
						<div>
							<h3 className='font-semibold mb-2'>Cena:</h3>
							<p className='text-lg font-bold text-gray-900'>Zapytaj o aktualną cenę</p>
							<p className='text-xs text-gray-500 mt-1'>
								Płatność obejmuje wyłącznie cenę usługi. Brak dodatkowych opłat.
							</p>
						</div>
						<div>
							<h3 className='font-semibold mb-2'>Dostępne metody płatności:</h3>
							<ul className='text-xs text-gray-600 space-y-1 ml-4 list-disc'>
								<li>Karta płatnicza (Stripe) - Visa, Mastercard</li>
								<li>Przelewy24 - przelewy bankowe, karty płatnicze, BLIK</li>
							</ul>
						</div>
						<div>
							<h3 className='font-semibold mb-2'>Realizacja usługi:</h3>
							<p>Usługa jest aktywowana natychmiast po potwierdzeniu płatności przez system płatniczy.</p>
						</div>
						<div>
							<h3 className='font-semibold mb-2'>Prawo odstąpienia:</h3>
							<p>
								Masz prawo odstąpić od umowy w terminie 14 dni od dnia zawarcia umowy, chyba że wyraziłeś zgodę na
								natychmiastową aktywację usługi. Wzór formularza odstąpienia dostępny jest{' '}
								<Link href='/formularz-odstapienia' className='text-blue-600 underline'>
									tutaj
								</Link>
								.
							</p>
						</div>
					</div>
				</div>

				{/* Terms Acceptance */}
				<div className='space-y-6 mb-8'>
					<h2 className='text-xl font-bold text-gray-900'>Akceptacja regulaminu i polityki prywatności</h2>

					<div className='space-y-4'>
						{/* Terms Checkbox */}
						<label className='flex items-start gap-3 p-4 border border-gray-200 rounded-xl hover:border-blue-300 transition-colors cursor-pointer'>
							<input
								type='checkbox'
								checked={termsAccepted}
								onChange={e => handleTermsChange(e.target.checked)}
								className='mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
								required
							/>
							<div className='flex-1'>
								<div className='flex items-center gap-2 mb-1'>
									{termsAccepted ? (
										<CheckCircle2 size={20} className='text-green-600' />
									) : (
										<AlertCircle size={20} className='text-gray-400' />
									)}
									<span className='font-semibold text-gray-900'>Regulamin Serwisu</span>
								</div>
								<p className='text-sm text-gray-600'>
									Oświadczam, że zapoznałem się z{' '}
									<Link href='/regulamin' target='_blank' className='text-blue-600 underline hover:no-underline'>
										Regulaminem Serwisu Katalogo.pl
									</Link>{' '}
									i akceptuję jego postanowienia.
								</p>
							</div>
						</label>

						{/* Privacy Checkbox */}
						<label className='flex items-start gap-3 p-4 border border-gray-200 rounded-xl hover:border-blue-300 transition-colors cursor-pointer'>
							<input
								type='checkbox'
								checked={privacyAccepted}
								onChange={e => handlePrivacyChange(e.target.checked)}
								className='mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
								required
							/>
							<div className='flex-1'>
								<div className='flex items-center gap-2 mb-1'>
									{privacyAccepted ? (
										<CheckCircle2 size={20} className='text-green-600' />
									) : (
										<AlertCircle size={20} className='text-gray-400' />
									)}
									<span className='font-semibold text-gray-900'>Polityka Prywatności</span>
								</div>
								<p className='text-sm text-gray-600'>
									Oświadczam, że zapoznałem się z{' '}
									<Link
										href='/polityka-prywatnosci'
										target='_blank'
										className='text-blue-600 underline hover:no-underline'
									>
										Polityką Prywatności
									</Link>{' '}
									i akceptuję zasady przetwarzania danych osobowych.
								</p>
							</div>
						</label>
					</div>

					{!canProceed && (
						<div className='bg-yellow-50 border border-yellow-200 rounded-xl p-4'>
							<p className='text-sm text-yellow-800'>
								<strong>Uwaga:</strong> Musisz zaakceptować zarówno Regulamin, jak i Politykę Prywatności, aby móc
								kontynuować zamówienie.
							</p>
						</div>
					)}
				</div>

				{/* Payment Method Selection */}
				<div className='space-y-4 mb-8'>
					<h2 className='text-xl font-bold text-gray-900'>Wybierz metodę płatności</h2>
					<div className='grid md:grid-cols-2 gap-4'>
						{/* Stripe Option */}
						<label
							className={`flex items-start gap-4 p-6 border-2 rounded-2xl cursor-pointer transition-all ${
								selectedPaymentMethod === 'stripe'
									? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
									: 'border-gray-200 hover:border-gray-300 bg-white'
							}`}
						>
							<input
								type='radio'
								name='paymentMethod'
								value='stripe'
								checked={selectedPaymentMethod === 'stripe'}
								onChange={() => setSelectedPaymentMethod('stripe')}
								className='mt-1 w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500'
							/>
							<div className='flex-1'>
								<div className='flex items-center gap-3 mb-2'>
									<div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold'>
										Stripe
									</div>
									<div>
										<h3 className='font-black text-gray-900'>Karta płatnicza (Stripe)</h3>
										<p className='text-xs text-gray-500'>Visa, Mastercard</p>
									</div>
								</div>
								<p className='text-sm text-gray-600'>
									Szybka i bezpieczna płatność kartą kredytową lub debetową. Obsługiwane przez Stripe.
								</p>
							</div>
						</label>

						{/* Przelewy24 Option */}
						<label
							className={`flex items-start gap-4 p-6 border-2 rounded-2xl cursor-pointer transition-all ${
								selectedPaymentMethod === 'przelewy24'
									? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
									: 'border-gray-200 hover:border-gray-300 bg-white'
							}`}
						>
							<input
								type='radio'
								name='paymentMethod'
								value='przelewy24'
								checked={selectedPaymentMethod === 'przelewy24'}
								onChange={() => setSelectedPaymentMethod('przelewy24')}
								className='mt-1 w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500'
							/>
							<div className='flex-1'>
								<div className='flex items-center gap-3 mb-2'>
									<div className='w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xs'>
										P24
									</div>
									<div>
										<h3 className='font-black text-gray-900'>Przelewy24</h3>
										<p className='text-xs text-gray-500'>Przelewy, karty, BLIK</p>
									</div>
								</div>
								<p className='text-sm text-gray-600'>
									Polski system płatności. Przelewy bankowe, karty płatnicze, BLIK i inne metody.
								</p>
							</div>
						</label>
					</div>
				</div>

				{/* Action Buttons */}
				<div className='flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200'>
					<button
						onClick={handleProceed}
						disabled={!canProceed || !companyId || isProcessing}
						className='flex-1 px-6 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2'
					>
						{isProcessing ? (
							<>
								<span className='animate-spin'>⏳</span>
								Przetwarzanie...
							</>
						) : (
							`Przejdź do płatności ${selectedPaymentMethod === 'stripe' ? '(Stripe)' : '(Przelewy24)'}`
						)}
					</button>
					<Link
						href='/dashboard'
						className='px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-center'
					>
						Anuluj
					</Link>
				</div>
			</div>
		</div>
	)
}
