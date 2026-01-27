import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'phone_reveal_require_form' },
    })

    return NextResponse.json({
      requireForm: setting?.value === 'true',
    })
  } catch (error) {
    console.error('Error fetching phone reveal setting:', error)
    return NextResponse.json(
      { requireForm: false },
      { status: 500 }
    )
  }
}
