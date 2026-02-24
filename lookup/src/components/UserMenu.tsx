'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { User, LogOut, LayoutDashboard, ChevronDown, Building2, ExternalLink } from 'lucide-react'
import { logoutAction } from '@/actions/authActions'

interface CompanyData {
	id: string
	name: string
	slug: string
}

interface UserData {
	id: string
	email: string
	displayName: string
	image?: string | null
	companies?: CompanyData[]
	primaryCompany?: CompanyData | null
}

export function UserMenu() {
	const [user, setUser] = useState<UserData | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [isOpen, setIsOpen] = useState(false)
	const menuRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const fetchUser = async () => {
			try {
				const res = await fetch('/api/auth/me')
				const data = await res.json()
				setUser(data.user)
			} catch (error) {
				console.error('Error fetching user:', error)
			} finally {
				setIsLoading(false)
			}
		}
		fetchUser()
	}, [])

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setIsOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	if (isLoading) {
		return <div className='w-8 h-8 bg-gray-200 rounded-full animate-pulse' />
	}

	if (!user) {
		return (
			<Link
				href='/strefa-partnera'
				className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors'
			>
				<User size={18} />
				<span className='hidden sm:inline'>Zaloguj się</span>
			</Link>
		)
	}

	const primaryCompany = user.primaryCompany
	const companies = user.companies || []

	return (
		<div className='relative' ref={menuRef}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className='flex items-center gap-2 px-3 py-2 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200'
			>
				{user.image ? (
					<img
						src={user.image}
						alt={user.displayName}
						className='w-7 h-7 rounded-full object-cover'
					/>
				) : (
					<div className='w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold'>
						{user.displayName.charAt(0).toUpperCase()}
					</div>
				)}
				<span className='hidden sm:block text-sm font-medium text-gray-800 max-w-[150px] truncate'>
					{user.displayName}
				</span>
				<ChevronDown
					size={14}
					className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
				/>
			</button>

			{isOpen && (
				<div className='absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50'>
					<div className='px-4 py-3 border-b border-gray-100'>
						<p className='text-sm font-semibold text-gray-900 truncate'>{user.displayName}</p>
						<p className='text-xs text-gray-500 truncate'>{user.email}</p>
					</div>

					{companies.length > 0 && (
						<div className='py-2 border-b border-gray-100'>
							<p className='px-4 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider'>
								Twoje firmy
							</p>
							{companies.map(company => (
								<Link
									key={company.id}
									href={`/firma/${company.slug}`}
									onClick={() => setIsOpen(false)}
									className='flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors'
								>
									<Building2 size={15} className='text-gray-400 shrink-0' />
									<span className='truncate'>{company.name}</span>
									<ExternalLink size={12} className='text-gray-300 ml-auto shrink-0' />
								</Link>
							))}
						</div>
					)}

					<div className='py-2'>
						<Link
							href='/dashboard'
							onClick={() => setIsOpen(false)}
							className='flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors'
						>
							<LayoutDashboard size={16} className='text-gray-400' />
							Panel zarządzania
						</Link>
					</div>

					<div className='border-t border-gray-100 pt-2'>
						<form action={logoutAction}>
							<button
								type='submit'
								className='flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors'
							>
								<LogOut size={16} />
								Wyloguj się
							</button>
						</form>
					</div>
				</div>
			)}
		</div>
	)
}
