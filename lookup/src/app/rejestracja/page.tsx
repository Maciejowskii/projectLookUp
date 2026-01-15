import RegisterFormClient from './RegisterFormClient'
import { Footer } from '@/components/Footer'

// Server Component - renders Client Component for form and Server Component for Footer
export default async function RegisterPage() {
	return (
		<>
			<RegisterFormClient />
			<Footer />
		</>
	)
}
