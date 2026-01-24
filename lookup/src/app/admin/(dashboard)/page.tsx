export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import {
	Building2,
	Users,
	TrendingUp,
	DollarSign,
	Activity,
	ShieldCheck,
	Clock,
	Star,
	MessageSquare,
	CheckCircle2,
	XCircle,
	FileDown,
} from 'lucide-react'
import Link from 'next/link'
import { AdminDashboardCharts } from './DashboardCharts'

// Pobieranie statystyk z bazy
async function getStats() {
	const now = new Date()
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
	const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

	// Równoległe zapytania dla wydajności
	const [
		totalCompanies,
		premiumCompanies,
		verifiedCompanies,
		totalLeads,
		totalReviews,
		pendingClaims,
		// Statystyki przejęć
		totalClaims,
		approvedClaims,
		rejectedClaims,
		claimsLast30Days,
		// Statystyki nowych firm (utworzonych przez formularz)
		newCompaniesLast30Days,
		// Dane z ostatnich 30 dni
		companiesLast30Days,
		leadsLast30Days,
		reviewsLast30Days,
		// Dane z poprzednich 30 dni (dla porównania)
		companiesPrev30Days,
		leadsPrev30Days,
		// Dane do wykresów - ostatnie 6 miesięcy
		monthlyData,
		// Dane do wykresów leadów
		leadsBySource,
		leadsDailyData,
		// Ostatnie aktywności
		recentLeads,
		recentClaims,
		recentReviews,
	] = await Promise.all([
		prisma.company.count(),
		prisma.company.count({ where: { plan: 'PREMIUM' } }),
		prisma.company.count({ where: { isVerified: true } }),
		prisma.lead.count(),
		prisma.review.count(),
		prisma.claimRequest.count({ where: { status: 'PENDING' } }),
		// Statystyki przejęć
		prisma.claimRequest.count(),
		prisma.claimRequest.count({ where: { status: 'APPROVED' } }),
		prisma.claimRequest.count({ where: { status: 'REJECTED' } }),
		prisma.claimRequest.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
		// Nowe firmy utworzone przez formularz (mają ClaimRequest z message zawierającym "Nowa wizytówka")
		prisma.claimRequest.count({
			where: {
				createdAt: { gte: thirtyDaysAgo },
				message: { contains: 'Nowa wizytówka' },
			},
		}),
		// Ostatnie 30 dni
		prisma.company.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
		prisma.lead.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
		prisma.review.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
		// Poprzednie 30 dni
		prisma.company.count({
			where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
		}),
		prisma.lead.count({
			where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
		}),
		// Dane miesięczne (ostatnie 6 miesięcy)
		getMonthlyGrowthData(),
		// Dane do wykresu leadów według źródła
		getLeadsBySource(),
		// Dane do wykresu leadów w czasie (ostatnie 30 dni)
		getLeadsDailyData(),
		// Ostatnie aktywności
		prisma.lead.findMany({
			take: 5,
			orderBy: { createdAt: 'desc' },
			include: { company: { select: { name: true, slug: true } } },
		}),
		prisma.claimRequest.findMany({
			take: 5,
			orderBy: { createdAt: 'desc' },
			include: { company: { select: { name: true } } },
		}),
		prisma.review.findMany({
			take: 5,
			orderBy: { createdAt: 'desc' },
			include: { company: { select: { name: true, slug: true } } },
		}),
	])

	// Oblicz zmiany procentowe
	const companiesChange = companiesPrev30Days > 0 ? Math.round(((companiesLast30Days - companiesPrev30Days) / companiesPrev30Days) * 100) : 100
	const leadsChange = leadsPrev30Days > 0 ? Math.round(((leadsLast30Days - leadsPrev30Days) / leadsPrev30Days) * 100) : 100
	const conversionRate = totalCompanies > 0 ? ((premiumCompanies / totalCompanies) * 100).toFixed(1) : '0'

	return {
		totalCompanies,
		premiumCompanies,
		verifiedCompanies,
		totalLeads,
		totalReviews,
		pendingClaims,
		totalClaims,
		approvedClaims,
		rejectedClaims,
		claimsLast30Days,
		newCompaniesLast30Days,
		companiesLast30Days,
		leadsLast30Days,
		reviewsLast30Days,
		companiesChange,
		leadsChange,
		conversionRate,
		monthlyData,
		leadsBySource,
		leadsDailyData,
		recentLeads,
		recentClaims,
		recentReviews,
	}
}

// Dane miesięczne do wykresu
async function getMonthlyGrowthData() {
	const months = []
	const now = new Date()

	for (let i = 5; i >= 0; i--) {
		const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
		const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

		const [companies, leads] = await Promise.all([
			prisma.company.count({
				where: {
					createdAt: { lt: nextMonth },
				},
			}),
			prisma.lead.count({
				where: {
					createdAt: { gte: date, lt: nextMonth },
				},
			}),
		])

		months.push({
			name: date.toLocaleDateString('pl-PL', { month: 'short' }),
			firmy: companies,
			leady: leads,
		})
	}

	return months
}

// Dane leadów według źródła
async function getLeadsBySource() {
	// Pobierz wszystkie leady i pogrupuj ręcznie (source może być nullable)
	const allLeads = await prisma.lead.findMany({})

	// Grupuj ręcznie
	const sourceCounts: Record<string, number> = {}
	for (const lead of allLeads) {
		// Używamy any ponieważ Prisma Client może nie mieć zaktualizowanych typów
		const source = (lead as any).source || 'UNKNOWN'
		sourceCounts[source] = (sourceCounts[source] || 0) + 1
	}

	const sourceLabels: Record<string, string> = {
		PHONE_REVEAL: 'Kliknięcie telefonu',
		PHONE_REVEAL_LOGGED_IN: 'Kliknięcie (zalogowany)',
		REGISTRATION: 'Rejestracja',
		LOGIN: 'Logowanie',
		CONTACT_FORM: 'Formularz kontaktowy',
		CSV_IMPORT: 'Import CSV',
		UNKNOWN: 'Nieznane',
	}

	return Object.entries(sourceCounts).map(([source, count]) => ({
		name: sourceLabels[source] || source,
		value: count,
		source: source,
	}))
}

// Dane leadów dziennie (ostatnie 30 dni)
async function getLeadsDailyData() {
	const days = []
	const now = new Date()

	for (let i = 29; i >= 0; i--) {
		const date = new Date(now)
		date.setDate(date.getDate() - i)
		date.setHours(0, 0, 0, 0)

		const nextDay = new Date(date)
		nextDay.setDate(nextDay.getDate() + 1)

		const count = await prisma.lead.count({
			where: {
				createdAt: {
					gte: date,
					lt: nextDay,
				},
			},
		})

		days.push({
			name: date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
			leady: count,
			fullDate: date.toISOString(),
		})
	}

	return days
}

export default async function AdminDashboard() {
	const stats = await getStats()

	return (
		<div className="space-y-8">
			{/* HEADER */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
				<div>
					<h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
					<p className="text-slate-500 text-sm mt-1">Przegląd statystyk portalu w czasie rzeczywistym</p>
				</div>
				<div className="flex gap-2">
					<span className="text-xs text-slate-400 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
						Ostatnia aktualizacja: {new Date().toLocaleString('pl-PL')}
					</span>
					<Link
						href="/admin/export"
						className="text-xs text-indigo-600 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 flex items-center gap-1.5 transition-colors"
					>
						<FileDown className="w-3.5 h-3.5" />
						Eksport danych
					</Link>
				</div>
			</div>

			{/* KPI CARDS */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<KPICard
					title="Wszystkie Firmy"
					value={stats.totalCompanies.toLocaleString('pl-PL')}
					change={`${stats.companiesChange >= 0 ? '+' : ''}${stats.companiesChange}%`}
					subtext={`+${stats.companiesLast30Days} w tym miesiącu`}
					icon={<Building2 className="w-5 h-5" />}
					color="blue"
				/>
				<KPICard
					title="Leady B2B"
					value={stats.totalLeads.toLocaleString('pl-PL')}
					change={`${stats.leadsChange >= 0 ? '+' : ''}${stats.leadsChange}%`}
					subtext={`+${stats.leadsLast30Days} w tym miesiącu`}
					icon={<Users className="w-5 h-5" />}
					color="purple"
				/>
				<KPICard
					title="Premium Firmy"
					value={stats.premiumCompanies.toLocaleString('pl-PL')}
					change={`${stats.conversionRate}%`}
					subtext="Wskaźnik konwersji"
					icon={<DollarSign className="w-5 h-5" />}
					color="emerald"
				/>
				<KPICard
					title="Zweryfikowane"
					value={stats.verifiedCompanies.toLocaleString('pl-PL')}
					change={`${stats.totalCompanies > 0 ? ((stats.verifiedCompanies / stats.totalCompanies) * 100).toFixed(1) : 0}%`}
					subtext="Ze wszystkich firm"
					icon={<ShieldCheck className="w-5 h-5" />}
					color="amber"
				/>
			</div>

			{/* STATYSTYKI PRZEJĘĆ I NOWYCH FIRM */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<KPICard
					title="Przejęcia (Wszystkie)"
					value={stats.totalClaims.toLocaleString('pl-PL')}
					change={`${stats.approvedClaims} zaakceptowanych`}
					subtext={`${stats.claimsLast30Days} w ostatnich 30 dniach`}
					icon={<ShieldCheck className="w-5 h-5" />}
					color="blue"
				/>
				<KPICard
					title="Zaakceptowane Przejęcia"
					value={stats.approvedClaims.toLocaleString('pl-PL')}
					change={`${stats.totalClaims > 0 ? ((stats.approvedClaims / stats.totalClaims) * 100).toFixed(1) : 0}%`}
					subtext="Ze wszystkich przejęć"
					icon={<CheckCircle2 className="w-5 h-5" />}
					color="emerald"
				/>
				<KPICard
					title="Odrzucone Przejęcia"
					value={stats.rejectedClaims.toLocaleString('pl-PL')}
					change={`${stats.totalClaims > 0 ? ((stats.rejectedClaims / stats.totalClaims) * 100).toFixed(1) : 0}%`}
					subtext="Ze wszystkich przejęć"
					icon={<XCircle className="w-5 h-5" />}
					color="amber"
				/>
				<KPICard
					title="Nowe Wizytówki"
					value={stats.newCompaniesLast30Days.toLocaleString('pl-PL')}
					change="Ostatnie 30 dni"
					subtext="Utworzone przez formularz"
					icon={<Building2 className="w-5 h-5" />}
					color="purple"
				/>
			</div>

			{/* CHARTS & ACTIVITIES */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* CHARTS */}
				<div className="lg:col-span-2 space-y-6">
					<AdminDashboardCharts
						growthData={stats.monthlyData}
						planData={[
							{ name: 'Darmowe', value: stats.totalCompanies - stats.premiumCompanies },
							{ name: 'Premium', value: stats.premiumCompanies },
						]}
						conversionRate={stats.conversionRate}
						leadsBySource={stats.leadsBySource}
						leadsDailyData={stats.leadsDailyData}
					/>
				</div>

				{/* RECENT ACTIVITIES */}
				<div className="space-y-6">
					{/* Pending Claims Alert */}
					{stats.pendingClaims > 0 && (
						<Link
							href="/admin/zgloszenia"
							className="block bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors"
						>
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
									<Clock className="w-5 h-5 text-amber-600" />
								</div>
								<div>
									<p className="font-semibold text-amber-900">
										{stats.pendingClaims} oczekujących zgłoszeń
									</p>
									<p className="text-xs text-amber-700">Kliknij aby przejść do weryfikacji</p>
								</div>
							</div>
						</Link>
					)}

					{/* Recent Leads */}
					<div className="bg-white rounded-xl border border-slate-200 p-4">
						<div className="flex items-center justify-between mb-4">
							<h3 className="font-semibold text-slate-900 flex items-center gap-2">
								<Users className="w-4 h-4 text-slate-400" />
								Ostatnie Leady
							</h3>
							<Link href="/admin/leads" className="text-xs text-indigo-600 hover:underline">
								Zobacz wszystkie
							</Link>
						</div>
						<div className="space-y-3">
							{stats.recentLeads.length > 0 ? (
								stats.recentLeads.map((lead) => (
									<div key={lead.id} className="flex items-center gap-3 text-sm">
										<div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
											{lead.contactName.charAt(0)}
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-medium text-slate-900 truncate">{lead.contactName}</p>
											<p className="text-xs text-slate-500 truncate">
												{lead.company?.name || 'Firma usunięta'}
											</p>
										</div>
										<span className="text-xs text-slate-400">
											{new Date(lead.createdAt).toLocaleDateString('pl-PL')}
										</span>
									</div>
								))
							) : (
								<p className="text-sm text-slate-400 text-center py-4">Brak leadów</p>
							)}
						</div>
					</div>

					{/* Recent Claims */}
					<div className="bg-white rounded-xl border border-slate-200 p-4">
						<div className="flex items-center justify-between mb-4">
							<h3 className="font-semibold text-slate-900 flex items-center gap-2">
								<ShieldCheck className="w-4 h-4 text-slate-400" />
								Ostatnie Przejęcia
							</h3>
							<Link href="/admin/zgloszenia" className="text-xs text-indigo-600 hover:underline">
								Zobacz wszystkie
							</Link>
						</div>
						<div className="space-y-3">
							{stats.recentClaims.length > 0 ? (
								stats.recentClaims.map((claim) => (
									<div key={claim.id} className="flex items-center gap-3 text-sm">
										<div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
											claim.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
											claim.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
											'bg-amber-100 text-amber-600'
										}`}>
											{claim.status === 'APPROVED' ? '✓' : claim.status === 'REJECTED' ? '✗' : '⏱'}
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-medium text-slate-900 truncate">{claim.fullName}</p>
											<p className="text-xs text-slate-500 truncate">
												{claim.company?.name || 'Firma usunięta'}
											</p>
										</div>
										<span className="text-xs text-slate-400">
											{new Date(claim.createdAt).toLocaleDateString('pl-PL')}
										</span>
									</div>
								))
							) : (
								<p className="text-sm text-slate-400 text-center py-4">Brak przejęć</p>
							)}
						</div>
					</div>

					{/* Recent Reviews */}
					<div className="bg-white rounded-xl border border-slate-200 p-4">
						<div className="flex items-center justify-between mb-4">
							<h3 className="font-semibold text-slate-900 flex items-center gap-2">
								<Star className="w-4 h-4 text-slate-400" />
								Ostatnie Opinie
							</h3>
							<Link href="/admin/reviews" className="text-xs text-indigo-600 hover:underline">
								Zobacz wszystkie
							</Link>
						</div>
						<div className="space-y-3">
							{stats.recentReviews.length > 0 ? (
								stats.recentReviews.map((review) => (
									<div key={review.id} className="flex items-start gap-3 text-sm">
										<div className="flex gap-0.5 mt-0.5">
											{[...Array(5)].map((_, i) => (
												<Star
													key={i}
													className={`w-3 h-3 ${
														i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
													}`}
												/>
											))}
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-medium text-slate-900 truncate">{review.userName}</p>
											<p className="text-xs text-slate-500 truncate">{review.company?.name}</p>
										</div>
									</div>
								))
							) : (
								<p className="text-sm text-slate-400 text-center py-4">Brak opinii</p>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

// KPI Card Component
interface KPICardProps {
	title: string
	value: string
	change: string
	subtext: string
	icon: React.ReactNode
	color: 'blue' | 'purple' | 'emerald' | 'amber'
}

function KPICard({ title, value, change, subtext, icon, color }: KPICardProps) {
	const colors = {
		blue: 'bg-blue-50 text-blue-600 border-blue-100',
		purple: 'bg-purple-50 text-purple-600 border-purple-100',
		emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
		amber: 'bg-amber-50 text-amber-600 border-amber-100',
	}

	const isPositive = change.startsWith('+') || (!change.startsWith('-') && parseFloat(change) >= 0)

	return (
		<div className="bg-white p-5 rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
			<div className="flex justify-between items-start mb-3">
				<div>
					<p className="text-sm font-medium text-slate-500">{title}</p>
					<h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
				</div>
				<div className={`p-2.5 rounded-lg border ${colors[color]}`}>{icon}</div>
			</div>

			<div className="flex items-center gap-2">
				<span
					className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
						isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
					}`}
				>
					{change}
				</span>
				<span className="text-xs text-slate-400">{subtext}</span>
			</div>
		</div>
	)
}
