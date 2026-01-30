'use client'

import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

type Props = {
	companyId: string
	companyName: string
	action: (companyId: string) => Promise<void>
	variant?: 'button' | 'icon'
}

export function DeleteCompanyButton({ companyId, companyName, action, variant = 'button' }: Props) {
	const router = useRouter()

	async function handleClick() {
		if (
			!window.confirm(
				`Czy na pewno usunąć wizytówkę "${companyName}"? Zostaną usunięte też powiązane zgłoszenia, leady i opinie.`,
			)
		)
			return
		await action(companyId)
		router.refresh()
	}

	if (variant === 'icon') {
		return (
			<button
				type='button'
				onClick={handleClick}
				className='p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors'
				title='Usuń wizytówkę'
			>
				<Trash2 size={18} />
			</button>
		)
	}

	return (
		<button
			type='button'
			onClick={handleClick}
			className='flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-xl text-sm font-bold transition-colors border border-red-200'
			title='Usuń wizytówkę'
		>
			<Trash2 size={16} /> Usuń wizytówkę
		</button>
	)
}
