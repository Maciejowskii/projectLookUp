'use client'

import { registerAction } from '@/actions/authActions'
import { Navbar } from '@/components/Navbar'
import { FooterWrapper } from '@/components/FooterWrapper'
import { OAuthButtons } from '@/components/OAuthButtons'
import { Lock, Mail, ArrowRight, UserPlus, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { Suspense } from 'react'

function SubmitButton() {
	const { pending } = useFormStatus()
	return (
		<button
			type='submit'
			disabled={pending}
			className='w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-gray-900/10 flex justify-center items-center gap-2 group transform active:scale-[0.98] mt-2 disabled:opacity-50 disabled:cursor-not-allowed'
		>
			{pending ? 'Tworzenie konta...' : 'Utwórz konto'}{' '}
			{!pending && <ArrowRight size={20} className='text-gray-400 group-hover:text-white transition-colors' />}
		</button>
	)
}

function RegisterForm() {
	const searchParams = useSearchParams()
	const error = searchParams.get('error')

	return (
		<div className='min-h-screen bg-[#F8FAFC] flex flex-col font-sans relative'>
			<Navbar />

			{/* Dekoracyjne tło */}
			<div className='absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-blue-50/50 to-transparent -z-10 pointer-events-none'></div>

			{/* Główny kontener */}
			<div className='flex-grow flex items-center justify-center pt-36 pb-20 px-4 sm:px-6'>
				<div className='w-full max-w-[500px] bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 overflow-hidden border border-white'>
					<div className='p-10 md:p-14'>
						<div className='mb-8 text-center'>
							<div className='w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4'>
								<UserPlus className='text-blue-600' size={32} />
							</div>
							<h1 className='text-3xl font-extrabold text-gray-900 mb-2 tracking-tight'>Utwórz konto</h1>
							<p className='text-gray-500'>Zarejestruj się, aby zarządzać swoimi firmami.</p>
						</div>

						<OAuthButtons />

						{/* Error message */}
						{error && (
							<div className='mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3'>
								<AlertCircle className='text-red-600 flex-shrink-0 mt-0.5' size={20} />
								<p className='text-sm text-red-800 font-medium'>{decodeURIComponent(error)}</p>
							</div>
						)}

						<form action={registerAction} className='space-y-5'>
							{/* Email */}
							<div>
								<label className='block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 ml-1'>Email</label>
								<div className='relative group'>
									<Mail
										className='absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-600 transition-colors'
										size={20}
									/>
									<input
										name='email'
										type='email'
										required
										placeholder='jan@firma.pl'
										className='w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 text-gray-900 font-medium'
									/>
								</div>
							</div>

							{/* Hasło */}
							<div>
								<label className='block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 ml-1'>Hasło</label>
								<div className='relative group'>
									<Lock
										className='absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-600 transition-colors'
										size={20}
									/>
									<input
										name='password'
										type='password'
										required
										minLength={8}
										placeholder='Min. 8 znaków'
										className='w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 text-gray-900 font-medium'
									/>
								</div>
								<p className='text-xs text-gray-500 mt-1 ml-1'>Hasło musi mieć minimum 8 znaków</p>
							</div>

							<SubmitButton />
						</form>

						<div className='mt-8 text-center border-t border-gray-100 pt-6'>
							<p className='text-gray-500 text-sm'>
								Masz już konto?{' '}
								<Link href='/strefa-partnera' className='text-blue-600 font-bold hover:text-blue-800 transition-colors'>
									Zaloguj się
								</Link>
							</p>
						</div>
					</div>
				</div>
			</div>
			<FooterWrapper />
		</div>
	)
}

export default function RegisterPage() {
	return (
		<Suspense fallback={
			<div className='min-h-screen bg-[#F8FAFC] flex items-center justify-center'>
				<div className='text-gray-500'>Ładowanie...</div>
			</div>
		}>
			<RegisterForm />
		</Suspense>
	)
}
