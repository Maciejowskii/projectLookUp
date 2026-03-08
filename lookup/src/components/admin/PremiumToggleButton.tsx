'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Crown } from 'lucide-react'

type Props = {
	companyId: string
	companyName: string
	isPremium: boolean
	premiumUntil: Date | null
	action: (companyId: string, isPremium: boolean) => Promise<void>
}

export function PremiumToggleButton({ companyId, companyName, isPremium, premiumUntil, action }: Props) {
	const router = useRouter()
	const [loading, setLoading] = useState(false)

	const premiumActive = isPremium && (!premiumUntil || new Date(premiumUntil) > new Date())

	async function handleToggle() {
		const msg = premiumActive
			? `Usunąć Premium dla "${companyName}"? Plan zmieni się na FREE.`
			: `Nadać Premium (365 dni) dla "${companyName}"?`

		if (!window.confirm(msg)) return

		setLoading(true)
		try {
			await action(companyId, !premiumActive)
			router.refresh()
		} catch (err) {
			console.error(err)
			alert('Wystąpił błąd')
		} finally {
			setLoading(false)
		}
	}

	if (premiumActive) {
		return (
			<button
				type='button'
				onClick={handleToggle}
				disabled={loading}
				className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all disabled:opacity-50 group'
				title={`Premium do ${new Date(premiumUntil!).toLocaleDateString('pl-PL')} — kliknij aby usunąć`}
			>
				<Crown size={12} />
				<span className='group-hover:hidden'>{loading ? '...' : 'PREMIUM'}</span>
				<span className='hidden group-hover:inline'>{loading ? '...' : 'Usuń'}</span>
			</button>
		)
	}

	return (
		<button
			type='button'
			onClick={handleToggle}
			disabled={loading}
			className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-all disabled:opacity-50'
			title='Nadaj Premium'
		>
			<Crown size={12} />
			{loading ? '...' : 'Nadaj Premium'}
		</button>
	)
}
