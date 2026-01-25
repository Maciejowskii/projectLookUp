'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Grid3x3, User } from 'lucide-react'

export function BottomNavigation() {
	const pathname = usePathname()

	// Ukryj bottom nav na niektórych stronach (dashboard, admin, etc.)
	const hideOnPaths = ['/dashboard', '/admin', '/dodaj-firme']
	const shouldHide = hideOnPaths.some(path => pathname?.startsWith(path))

	if (shouldHide) return null

	const navItems = [
		{
			href: '/',
			label: 'Strona główna',
			icon: Home,
		},
		{
			href: '/szukaj',
			label: 'Szukaj',
			icon: Search,
		},
		{
			href: '/kategorie',
			label: 'Kategorie',
			icon: Grid3x3,
		},
		{
			href: '/dashboard',
			label: 'Profil',
			icon: User,
		},
	]

	return (
		<nav
			className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:hidden"
			style={{
				paddingBottom: `calc(0.5rem + var(--safe-area-inset-bottom))`,
			}}
		>
			<div className="flex items-center justify-around px-2 py-2">
				{navItems.map((item) => {
					const Icon = item.icon
					const isActive = pathname === item.href || (item.href === '/' && pathname === '/')
					
					return (
						<Link
							key={item.href}
							href={item.href}
							className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl touch-manipulation active:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] ${
								isActive
									? 'text-blue-600'
									: 'text-gray-600'
							}`}
							aria-label={item.label}
						>
							<Icon
								size={22}
								className={isActive ? 'text-blue-600' : 'text-gray-500'}
							/>
							<span className={`text-[10px] font-medium ${
								isActive ? 'text-blue-600' : 'text-gray-500'
							}`}>
								{item.label}
							</span>
						</Link>
					)
				})}
			</div>
		</nav>
	)
}
