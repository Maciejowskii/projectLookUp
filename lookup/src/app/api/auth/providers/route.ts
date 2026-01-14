import { NextResponse } from 'next/server'
import { getProviders } from '@/lib/auth'

export async function GET() {
	try {
		// Get providers list without initializing full authOptions
		const providers = getProviders()
		const providersObj: Record<string, any> = {}
		
		providers.forEach((provider: any) => {
			if (provider?.id) {
				providersObj[provider.id] = {
					id: provider.id,
					name: provider.name || provider.id,
				}
			}
		})
		
		return NextResponse.json(providersObj)
	} catch (error) {
		// Return empty object if NextAuth is not configured
		console.error('Error getting providers:', error)
		return NextResponse.json({})
	}
}
