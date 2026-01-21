'use client'

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

export function LeadsCharts({ leads }: LeadsChartsProps) {
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

	// Statystyki według daty (ostatnie 30 dni)
	const now = new Date()
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
	const recentLeads = leads.filter(lead => new Date(lead.createdAt) >= thirtyDaysAgo)

	const dateStats = recentLeads.reduce((acc, lead) => {
		const date = new Date(lead.createdAt)
		const dateKey = date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
		acc[dateKey] = (acc[dateKey] || 0) + 1
		return acc
	}, {} as Record<string, number>)

	// Wypełnij wszystkie dni (ostatnie 30)
	const dateData = []
	for (let i = 29; i >= 0; i--) {
		const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
		const dateKey = date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
		dateData.push({
			date: dateKey,
			leady: dateStats[dateKey] || 0,
		})
	}

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
							<p className='text-sm text-gray-500'>Ostatnie 30 dni</p>
							<p className='text-2xl font-bold text-gray-900'>{recentLeads.length}</p>
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
								{recentLeads.length > 0 ? Math.round((recentLeads.length / 30) * 10) / 10 : 0}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Wykresy */}
			<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
				{/* Wykres liniowy - Leady w czasie (ostatnie 30 dni) */}
				<div className='bg-white p-6 rounded-xl border border-gray-200'>
					<h3 className='font-bold text-gray-900 mb-4 flex items-center gap-2'>
						<TrendingUp size={18} className='text-blue-600' />
						Leady w czasie (ostatnie 30 dni)
					</h3>
					<div className='h-[300px]'>
						<ResponsiveContainer width='100%' height='100%'>
							<LineChart data={dateData}>
								<CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#F1F5F9' />
								<XAxis
									dataKey='date'
									axisLine={false}
									tickLine={false}
									tick={{ fill: '#94A3B8', fontSize: 11 }}
									interval={2}
								/>
								<YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
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
									stroke='#6366F1'
									strokeWidth={2.5}
									dot={{ r: 3, fill: '#6366F1' }}
									activeDot={{ r: 5 }}
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
								<XAxis type='number' axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
								<YAxis
									dataKey='name'
									type='category'
									axisLine={false}
									tickLine={false}
									tick={{ fill: '#94A3B8', fontSize: 11 }}
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
