'use client'

import { useSearchParams } from 'next/navigation'
import { AlertCircle, X } from 'lucide-react'
import { useState, useEffect } from 'react'

export function LoginError() {
	const searchParams = useSearchParams()
	const error = searchParams.get('error')
	const [isVisible, setIsVisible] = useState(!!error)

	useEffect(() => {
		setIsVisible(!!error)
	}, [error])

	if (!error || !isVisible) return null

	return (
		<div className='mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 relative'>
			<div className='flex items-start gap-3'>
				<AlertCircle className='text-red-600 flex-shrink-0 mt-0.5' size={20} />
				<div className='flex-1'>
					<p className='text-sm font-semibold text-red-900 mb-1'>Błąd logowania</p>
					<p className='text-sm text-red-800'>{error}</p>
				</div>
				<button
					onClick={() => setIsVisible(false)}
					className='text-red-400 hover:text-red-600 transition-colors flex-shrink-0'
					aria-label='Zamknij'
				>
					<X size={18} />
				</button>
			</div>
		</div>
	)
}
