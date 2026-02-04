import { NextResponse } from 'next/server'

/**
 * Health check dla load balancera / Coolify / Traefik / Caddy.
 * GET /api/health zwraca 200 gdy aplikacja jest gotowa do przyjmowania ruchu.
 */
export async function GET() {
	return NextResponse.json({ ok: true, status: 'ready' }, { status: 200 })
}
