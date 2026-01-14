import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className='min-h-screen bg-gray-50 font-sans flex flex-col'>
			<Navbar />
			<main className='flex-grow'>{children}</main>
			<Footer />
		</div>
	)
}
