import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

export async function GET() {
	try {
		// Return providers list as object with provider IDs as keys
		const providers = authOptions.providers || []
		const providersObj: Record<string, any> = {}
		
		providers.forEach((provider: any) => {
			if (provider.id) {
				providersObj[provider.id] = {
					id: provider.id,
					name: provider.name || provider.id,
				}
			}
		})
		
		return NextResponse.json(providersObj)
	} catch (error) {
		// Return empty object if NextAuth is not configured
		return NextResponse.json({})
	}
}
