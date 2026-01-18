import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
	LayoutDashboard,
	Building2,
	Users,
	ShieldCheck,
	MessageSquare,
	Layers,
	Terminal,
	Settings,
	PenTool,
	LogOut,
	Shield,
	Menu,
	ClipboardList,
} from 'lucide-react'
import { getAdminSession, AdminSessionData } from '@/lib/adminAuth'
import { logoutAction } from '../login/actions'

// Elementy nawigacji
const navItems = [
	{
		section: 'Ogólne',
		items: [
			{ href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
			{ href: '/admin/reviews', icon: MessageSquare, label: 'Opinie' },
		],
	},
	{
		section: 'Baza Danych',
		items: [
			{ href: '/admin/companies', icon: Building2, label: 'Firmy' },
			{ href: '/admin/categories', icon: Layers, label: 'Kategorie' },
		],
	},
	{
		section: 'Monetyzacja',
		items: [
			{ href: '/admin/zgloszenia', icon: ShieldCheck, label: 'Przejęcia (Claims)', badge: true },
			{ href: '/admin/leads', icon: Users, label: 'Leady Użytkowników' },
			{ href: '/admin/blog', icon: PenTool, label: 'Blog & AI' },
		],
	},
	{
		section: 'System',
		items: [
			{ href: '/admin/logs', icon: Terminal, label: 'Logi Scrapera' },
			{ href: '/admin/audit', icon: ClipboardList, label: 'Audit Log' },
			{ href: '/admin/settings', icon: Settings, label: 'Ustawienia' },
		],
	},
]

interface AdminLayoutProps {
	children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
	// Sprawdź sesję - jeśli brak, przekieruj do logowania
	// Wyjątek dla strony /admin/login która jest publiczna
	const session = await getAdminSession()

	// Ten layout NIE renderuje się dla /admin/login (ma własny layout)
	// więc możemy bezpiecznie przekierować jeśli brak sesji
	if (!session) {
		redirect('/admin/login')
	}

	return (
		<div className="flex min-h-screen bg-slate-50">
			{/* SIDEBAR */}
			<aside className="w-64 bg-slate-900 flex-shrink-0 hidden lg:flex flex-col fixed h-screen">
				{/* Logo */}
				<div className="p-6 border-b border-slate-800">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
							<Shield className="w-5 h-5 text-white" />
						</div>
						<div>
							<h2 className="text-lg font-bold text-white">Admin Panel</h2>
							<p className="text-xs text-slate-500">v2.0 Secure</p>
						</div>
					</div>
				</div>

				{/* Navigation */}
				<nav className="flex-1 py-4 overflow-y-auto">
					{navItems.map((group) => (
						<div key={group.section} className="mb-6">
							<p className="px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
								{group.section}
							</p>
							<div className="space-y-0.5 px-3">
								{group.items.map((item) => (
									<Link
										key={item.href}
										href={item.href}
										className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all text-sm font-medium group"
									>
										<item.icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
										<span>{item.label}</span>
										{item.badge && (
											<span className="ml-auto flex h-2 w-2">
												<span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
												<span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
											</span>
										)}
									</Link>
								))}
							</div>
						</div>
					))}
				</nav>

				{/* User Info & Logout */}
				<div className="p-4 border-t border-slate-800">
					<div className="bg-slate-800/50 rounded-xl p-3 mb-3">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
								{session.user.name?.charAt(0) || session.user.email.charAt(0).toUpperCase()}
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-white truncate">
									{session.user.name || 'Administrator'}
								</p>
								<p className="text-xs text-slate-500 truncate">{session.user.email}</p>
							</div>
						</div>
						<div className="mt-2 flex items-center gap-2">
							<span
								className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
									session.user.role === 'SUPER_ADMIN'
										? 'bg-amber-500/20 text-amber-400'
										: 'bg-indigo-500/20 text-indigo-400'
								}`}
							>
								{session.user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
							</span>
						</div>
					</div>

					<form action={logoutAction}>
						<button
							type="submit"
							className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 py-2.5 rounded-lg transition-colors"
						>
							<LogOut className="w-4 h-4" />
							Wyloguj się
						</button>
					</form>
				</div>
			</aside>

			{/* Mobile Header */}
			<div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 z-50 flex items-center justify-between px-4">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
						<Shield className="w-4 h-4 text-white" />
					</div>
					<span className="text-white font-bold">Admin</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-slate-400 text-sm">{session.user.email}</span>
					<form action={logoutAction}>
						<button type="submit" className="p-2 text-slate-400 hover:text-red-400 transition-colors">
							<LogOut className="w-5 h-5" />
						</button>
					</form>
				</div>
			</div>

			{/* CONTENT */}
			<main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
				<div className="p-6 lg:p-8 min-h-screen">
					<div className="max-w-7xl mx-auto">{children}</div>
				</div>
			</main>
		</div>
	)
}
