'use server'

import { adminLogin, adminLogout } from '@/lib/adminAuth'
import { redirect } from 'next/navigation'

export async function loginAction(email: string, password: string) {
	return await adminLogin(email, password)
}

export async function logoutAction() {
	await adminLogout()
	redirect('/admin/login')
}
