import { Suspense } from 'react'
import CheckoutClient from './CheckoutClient'
import { Loader2 } from 'lucide-react'

export default function CheckoutPage() {
	return (
		<Suspense
			fallback={
				<div className='container mx-auto px-4 py-12 max-w-4xl flex items-center justify-center min-h-[400px]'>
					<div className='text-center'>
						<Loader2 className='animate-spin w-10 h-10 text-blue-600 mx-auto mb-4' />
						<p className='text-gray-500 font-medium'>Ładowanie...</p>
					</div>
				</div>
			}
		>
			<CheckoutClient />
		</Suspense>
	)
}
