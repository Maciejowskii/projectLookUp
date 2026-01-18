'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { loginAction } from './actions'

export default function AdminLoginPage() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [error, setError] = useState('')
	const [isPending, startTransition] = useTransition()
	const router = useRouter()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')

		if (!email || !password) {
			setError('Wypełnij wszystkie pola')
			return
		}

		startTransition(async () => {
			const result = await loginAction(email, password)
			
			if (result.success) {
				router.push('/admin')
				router.refresh()
			} else {
				setError(result.error || 'Błąd logowania')
			}
		})
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
			{/* Background Pattern */}
			<div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%234f46e5%22%20fill-opacity%3D%220.03%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50"></div>
			
			<div className="relative w-full max-w-md">
				{/* Card */}
				<div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
					{/* Header */}
					<div className="text-center mb-8">
						<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-indigo-500/30">
							<Shield className="w-8 h-8 text-white" />
						</div>
						<h1 className="text-2xl font-bold text-white mb-2">Panel Administracyjny</h1>
						<p className="text-slate-400 text-sm">Zaloguj się, aby zarządzać portalem</p>
					</div>

					{/* Error Message */}
					{error && (
						<div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
							<AlertCircle className="w-5 h-5 flex-shrink-0" />
							<span>{error}</span>
						</div>
					)}

					{/* Form */}
					<form onSubmit={handleSubmit} className="space-y-5">
						{/* Email */}
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-2">
								Adres email
							</label>
							<div className="relative">
								<Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
									placeholder="admin@example.com"
									autoComplete="email"
									disabled={isPending}
								/>
							</div>
						</div>

						{/* Password */}
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-2">
								Hasło
							</label>
							<div className="relative">
								<Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
								<input
									type={showPassword ? 'text' : 'password'}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
									placeholder="••••••••"
									autoComplete="current-password"
									disabled={isPending}
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
								>
									{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
								</button>
							</div>
						</div>

						{/* Submit Button */}
						<button
							type="submit"
							disabled={isPending}
							className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
						>
							{isPending ? (
								<>
									<Loader2 className="w-5 h-5 animate-spin" />
									<span>Logowanie...</span>
								</>
							) : (
								<>
									<Lock className="w-5 h-5" />
									<span>Zaloguj się</span>
								</>
							)}
						</button>
					</form>

					{/* Security Notice */}
					<div className="mt-8 pt-6 border-t border-white/10">
						<p className="text-xs text-center text-slate-500">
							Ta strona jest chroniona. Wszystkie próby logowania są rejestrowane.
						</p>
					</div>
				</div>

				{/* Footer */}
				<p className="text-center text-slate-600 text-xs mt-6">
					© {new Date().getFullYear()} LookUp Admin Panel
				</p>
			</div>
		</div>
	)
}
