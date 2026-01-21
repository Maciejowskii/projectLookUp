'use client'

import { useState } from 'react'
import {
	BarChart,
	Bar,
	PieChart,
	Pie,
	Cell,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	LineChart,
	Line,
	Legend,
} from 'recharts'
import { TrendingUp, Users, Building2, Calendar } from 'lucide-react'

interface Lead {
	id: string
	contactName: string
	email: string
	phone: string
	description: string | null
	source: string | null
	status: string
	createdAt: Date
	company: {
		id: string
		name: string
		slug: string
	} | null
}

interface LeadsChartsProps {
	leads: Lead[]
}

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444']

const getSourceLabel = (source: string | null) => {
	if (!source) return 'Nieznane'
	const labels: Record<string, string> = {
		PHONE_REVEAL: 'Kliknięcie telefonu',
		PHONE_REVEAL_LOGGED_IN: 'Kliknięcie (zalogowany)',
		REGISTRATION: 'Rejestracja',
		LOGIN: 'Logowanie',
		CONTACT_FORM: 'Formularz kontaktowy',
		CSV_IMPORT: 'Import CSV',
	}
	return labels[source] || source
}

type TimeRange = 'week' | 'month' | '3months' | 'year'

export function LeadsCharts({ leads }: LeadsChartsProps) {
	const [timeRange, setTimeRange] = useState<TimeRange>('month')

	// Statystyki według źródła
	const sourceStats = leads.reduce((acc, lead) => {
		const source = lead.source || 'Nieznane'
		acc[source] = (acc[source] || 0) + 1
		return acc
	}, {} as Record<string, number>)

	const sourceData = Object.entries(sourceStats)
		.map(([name, value]) => ({
			name: getSourceLabel(name),
			value,
			originalName: name,
		}))
		.sort((a, b) => b.value - a.value)

	// Statystyki według firmy (top 10)
	const companyStats = leads.reduce((acc, lead) => {
		if (!lead.company) return acc
		const companyName = lead.company.name
		acc[companyName] = (acc[companyName] || 0) + 1
		return acc
	}, {} as Record<string, number>)

	const companyData = Object.entries(companyStats)
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value)
		.slice(0, 10)

	// Statystyki według daty - dynamiczne w zależności od wybranego zakresu
	const now = new Date()
	
	const getDateRange = (range: TimeRange) => {
		const ranges = {
			week: { days: 7, step: 1, label: '7 dni' },
			month: { days: 30, step: 1, label: '30 dni' },
			'3months': { days: 90, step: 3, label: '90 dni' },
			year: { days: 365, step: 7, label: '365 dni' },
		}
		return ranges[range]
	}

	const rangeConfig = getDateRange(timeRange)
	const startDate = new Date(now.getTime() - rangeConfig.days * 24 * 60 * 60 * 1000)
	const filteredLeads = leads.filter(lead => new Date(lead.createdAt) >= startDate)

	const dateStats = filteredLeads.reduce((acc, lead) => {
		const date = new Date(lead.createdAt)
		let dateKey: string
		
		if (timeRange === 'year') {
			// Dla roku grupuj po tygodniach
			const weekStart = new Date(date)
			weekStart.setDate(date.getDate() - date.getDay())
			dateKey = weekStart.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
		} else if (timeRange === '3months') {
			// Dla 3 miesięcy grupuj po 3 dni
			dateKey = date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
		} else {
			// Dla tygodnia i miesiąca - pojedyncze dni
			dateKey = date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
		}
		
		acc[dateKey] = (acc[dateKey] || 0) + 1
		return acc
	}, {} as Record<string, number>)

	// Generuj dane dla wykresu
	const dateData: Array<{ date: string; leady: number }> = []
	const step = rangeConfig.step
	
	for (let i = rangeConfig.days - 1; i >= 0; i -= step) {
		const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
		let dateKey: string
		
		if (timeRange === 'year') {
			const weekStart = new Date(date)
			weekStart.setDate(date.getDate() - date.getDay())
			dateKey = weekStart.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
		} else {
			dateKey = date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
		}
		
		// Dla 3 miesięcy i roku, sumuj leady z całego okresu
		if (timeRange === '3months' || timeRange === 'year') {
			let total = 0
			for (let j = 0; j < step; j++) {
				const checkDate = new Date(date.getTime() + j * 24 * 60 * 60 * 1000)
				const checkKey = checkDate.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
				total += dateStats[checkKey] || 0
			}
			dateData.push({
				date: dateKey,
				leady: total,
			})
		} else {
			dateData.push({
				date: dateKey,
				leady: dateStats[dateKey] || 0,
			})
		}
	}

	// Usuń duplikaty dla roku (grupowanie tygodniowe)
	const uniqueDateData = timeRange === 'year' 
		? dateData.reduce((acc, item) => {
				const existing = acc.find(d => d.date === item.date)
				if (existing) {
					existing.leady += item.leady
				} else {
					acc.push({ ...item })
				}
				return acc
			}, [] as typeof dateData)
		: dateData

	// Statystyki według statusu
	const statusStats = leads.reduce((acc, lead) => {
		const status = lead.status || 'NEW'
		acc[status] = (acc[status] || 0) + 1
		return acc
	}, {} as Record<string, number>)

	const statusData = Object.entries(statusStats).map(([name, value]) => ({
		name: name === 'NEW' ? 'Nowe' : name === 'PHONE_REVEAL' ? 'Kliknięcie' : name,
		value,
	}))

	return (
		<div className='space-y-6'>
			{/* Statystyki ogólne */}
			<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
				<div className='bg-white p-6 rounded-xl border border-gray-200'>
					<div className='flex items-center gap-3 mb-2'>
						<div className='w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center'>
							<Users className='text-blue-600' size={20} />
						</div>
						<div>
							<p className='text-sm text-gray-500'>Wszystkie leady</p>
							<p className='text-2xl font-bold text-gray-900'>{leads.length}</p>
						</div>
					</div>
				</div>

				<div className='bg-white p-6 rounded-xl border border-gray-200'>
					<div className='flex items-center gap-3 mb-2'>
						<div className='w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center'>
							<Building2 className='text-purple-600' size={20} />
						</div>
						<div>
							<p className='text-sm text-gray-500'>Firmy z leadami</p>
							<p className='text-2xl font-bold text-gray-900'>
								{new Set(leads.filter(l => l.company).map(l => l.company!.id)).size}
							</p>
						</div>
					</div>
				</div>

				<div className='bg-white p-6 rounded-xl border border-gray-200'>
					<div className='flex items-center gap-3 mb-2'>
						<div className='w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center'>
							<Calendar className='text-green-600' size={20} />
						</div>
						<div>
							<p className='text-sm text-gray-500'>Ostatnie {rangeConfig.label}</p>
							<p className='text-2xl font-bold text-gray-900'>{filteredLeads.length}</p>
						</div>
					</div>
				</div>

				<div className='bg-white p-6 rounded-xl border border-gray-200'>
					<div className='flex items-center gap-3 mb-2'>
						<div className='w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center'>
							<TrendingUp className='text-orange-600' size={20} />
						</div>
						<div>
							<p className='text-sm text-gray-500'>Średnio dziennie</p>
							<p className='text-2xl font-bold text-gray-900'>
								{filteredLeads.length > 0 ? Math.round((filteredLeads.length / rangeConfig.days) * 10) / 10 : 0}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Wykresy */}
			<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
				{/* Wykres liniowy - Leady w czasie */}
				<div className='bg-white p-6 rounded-xl border border-gray-200'>
					<div className='flex items-center justify-between mb-4'>
						<h3 className='font-bold text-gray-900 flex items-center gap-2'>
							<TrendingUp size={18} className='text-blue-600' />
							Leady w czasie
						</h3>
						<div className='flex gap-2'>
							<button
								onClick={() => setTimeRange('week')}
								className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
									timeRange === 'week'
										? 'bg-blue-600 text-white'
										: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
								}`}
							>
								Tydzień
							</button>
							<button
								onClick={() => setTimeRange('month')}
								className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
									timeRange === 'month'
										? 'bg-blue-600 text-white'
										: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
								}`}
							>
								Miesiąc
							</button>
							<button
								onClick={() => setTimeRange('3months')}
								className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
									timeRange === '3months'
										? 'bg-blue-600 text-white'
										: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
								}`}
							>
								3 miesiące
							</button>
							<button
								onClick={() => setTimeRange('year')}
								className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
									timeRange === 'year'
										? 'bg-blue-600 text-white'
										: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
								}`}
							>
								Rok
							</button>
						</div>
					</div>
					<div className='h-[300px]'>
						<ResponsiveContainer width='100%' height='100%'>
							<LineChart data={uniqueDateData}>
								<CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#F1F5F9' />
								<XAxis
									dataKey='date'
									axisLine={false}
									tickLine={false}
									tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
									angle={timeRange === 'year' ? -45 : 0}
									dy={timeRange === 'year' ? 10 : 5}
									interval={timeRange === 'week' ? 0 : timeRange === 'month' ? 2 : timeRange === '3months' ? 4 : 6}
								/>
								<YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
								<Tooltip
									contentStyle={{
										borderRadius: '12px',
										border: 'none',
										boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
										backgroundColor: '#fff',
									}}
								/>
								<Line
									type='monotone'
									dataKey='leady'
									stroke='#1E40AF'
									strokeWidth={3}
									dot={{ r: 4, fill: '#1E40AF', strokeWidth: 2, stroke: '#fff' }}
									activeDot={{ r: 6, fill: '#1E40AF' }}
									name='Leady'
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>

				{/* Wykres kołowy - Według źródła */}
				<div className='bg-white p-6 rounded-xl border border-gray-200'>
					<h3 className='font-bold text-gray-900 mb-4 flex items-center gap-2'>
						<Users size={18} className='text-purple-600' />
						Leady według źródła
					</h3>
					<div className='h-[300px]'>
						<ResponsiveContainer width='100%' height='100%'>
							<PieChart>
								<Pie
									data={sourceData}
									cx='50%'
									cy='50%'
									labelLine={false}
									label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
									outerRadius={100}
									fill='#8884d8'
									dataKey='value'
								>
									{sourceData.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
									))}
								</Pie>
								<Tooltip />
							</PieChart>
						</ResponsiveContainer>
					</div>
				</div>

				{/* Wykres słupkowy - Top 10 firm */}
				<div className='bg-white p-6 rounded-xl border border-gray-200 lg:col-span-2'>
					<h3 className='font-bold text-gray-900 mb-4 flex items-center gap-2'>
						<Building2 size={18} className='text-green-600' />
						Top 10 firm z największą liczbą leadów
					</h3>
					<div className='h-[300px]'>
						<ResponsiveContainer width='100%' height='100%'>
							<BarChart data={companyData} layout='vertical'>
								<CartesianGrid strokeDasharray='3 3' horizontal={true} vertical={false} stroke='#F1F5F9' />
								<XAxis type='number' axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
								<YAxis
									dataKey='name'
									type='category'
									axisLine={false}
									tickLine={false}
									tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
									width={150}
								/>
								<Tooltip
									contentStyle={{
										borderRadius: '12px',
										border: 'none',
										boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
										backgroundColor: '#fff',
									}}
								/>
								<Bar dataKey='value' fill='#6366F1' radius={[0, 8, 8, 0]} name='Leady' />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>

			{/* Podkategorie - szczegółowe statystyki */}
			<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
				{/* Według źródła - lista */}
				<div className='bg-white p-6 rounded-xl border border-gray-200'>
					<h3 className='font-bold text-gray-900 mb-4'>Rozkład według źródła</h3>
					<div className='space-y-3'>
						{sourceData.map((item, index) => (
							<div key={item.originalName} className='flex items-center justify-between'>
								<div className='flex items-center gap-3'>
									<div
										className='w-4 h-4 rounded'
										style={{ backgroundColor: COLORS[index % COLORS.length] }}
									></div>
									<span className='text-sm text-gray-700'>{item.name}</span>
								</div>
								<div className='flex items-center gap-4'>
									<div className='w-24 bg-gray-100 rounded-full h-2'>
										<div
											className='h-2 rounded-full'
											style={{
												width: `${(item.value / leads.length) * 100}%`,
												backgroundColor: COLORS[index % COLORS.length],
											}}
										></div>
									</div>
									<span className='text-sm font-bold text-gray-900 w-12 text-right'>{item.value}</span>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Według statusu */}
				<div className='bg-white p-6 rounded-xl border border-gray-200'>
					<h3 className='font-bold text-gray-900 mb-4'>Rozkład według statusu</h3>
					<div className='space-y-3'>
						{statusData.map((item, index) => (
							<div key={item.name} className='flex items-center justify-between'>
								<span className='text-sm text-gray-700'>{item.name}</span>
								<div className='flex items-center gap-4'>
									<div className='w-24 bg-gray-100 rounded-full h-2'>
										<div
											className='h-2 rounded-full bg-blue-500'
											style={{ width: `${(item.value / leads.length) * 100}%` }}
										></div>
									</div>
									<span className='text-sm font-bold text-gray-900 w-12 text-right'>{item.value}</span>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}
