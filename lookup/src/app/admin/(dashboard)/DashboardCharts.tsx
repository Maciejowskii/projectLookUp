'use client'

import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	BarChart,
	Bar,
	Legend,
} from 'recharts'
import { TrendingUp, Users } from 'lucide-react'

interface GrowthData {
	name: string
	firmy: number
	leady: number
}

interface PlanData {
	name: string
	value: number
	[key: string]: string | number
}

interface SourceData {
	name: string
	value: number
	source: string
	[key: string]: string | number
}

interface DailyLeadData {
	name: string
	leady: number
	fullDate: string
}

interface AdminDashboardChartsProps {
	growthData: GrowthData[]
	planData: PlanData[]
	conversionRate: string
	leadsBySource?: SourceData[]
	leadsDailyData?: DailyLeadData[]
}

const COLORS = ['#E2E8F0', '#6366F1'] // Slate dla Free, Indigo dla Premium
const SOURCE_COLORS = ['#6366F1', '#A855F7', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'] // Kolory dla różnych źródeł

export function AdminDashboardCharts({ 
	growthData, 
	planData, 
	conversionRate,
	leadsBySource = [],
	leadsDailyData = []
}: AdminDashboardChartsProps) {
	return (
		<div className="space-y-6">
			{/* Główne wykresy - Growth i Monetization */}
			<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
				{/* Line Chart - Growth */}
				<div className="xl:col-span-2 bg-white p-6 rounded-xl border border-slate-200">
				<h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
					<TrendingUp className="w-4 h-4 text-indigo-600" />
					Wzrost bazy firm i leadów
				</h3>
				<div className="h-[280px] w-full">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={growthData}>
							<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
							<XAxis
								dataKey="name"
								axisLine={false}
								tickLine={false}
								tick={{ fill: '#94A3B8', fontSize: 12 }}
								dy={10}
							/>
							<YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
							<Tooltip
								contentStyle={{
									borderRadius: '12px',
									border: 'none',
									boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
									backgroundColor: '#fff',
								}}
								labelStyle={{ fontWeight: 600 }}
							/>
							<Line
								type="monotone"
								dataKey="firmy"
								stroke="#6366F1"
								strokeWidth={2.5}
								dot={{ r: 4, fill: '#6366F1', strokeWidth: 2, stroke: '#fff' }}
								activeDot={{ r: 6 }}
								name="Liczba Firm (kumulatywnie)"
							/>
							<Line
								type="monotone"
								dataKey="leady"
								stroke="#A855F7"
								strokeWidth={2.5}
								dot={{ r: 4, fill: '#A855F7', strokeWidth: 2, stroke: '#fff' }}
								name="Leady (w miesiącu)"
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
				<div className="mt-4 flex items-center justify-center gap-6">
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 rounded-full bg-indigo-500"></div>
						<span className="text-sm text-slate-600">Firmy</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 rounded-full bg-purple-500"></div>
						<span className="text-sm text-slate-600">Leady</span>
					</div>
				</div>
				</div>

				{/* Pie Chart - Monetization */}
				<div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col">
				<h3 className="font-semibold text-slate-900 mb-2">Monetyzacja</h3>
				<p className="text-sm text-slate-500 mb-4">Free vs Premium</p>

				<div className="flex-1 min-h-[200px] relative">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie
								data={planData}
								cx="50%"
								cy="50%"
								innerRadius={60}
								outerRadius={80}
								paddingAngle={5}
								dataKey="value"
							>
								{planData.map((entry, index) => (
									<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
								))}
							</Pie>
							<Tooltip
								formatter={(value) => [typeof value === 'number' ? value.toLocaleString('pl-PL') : value, '']}
								contentStyle={{
									borderRadius: '8px',
									border: 'none',
									boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.1)',
								}}
							/>
						</PieChart>
					</ResponsiveContainer>

					{/* Center Text */}
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
						<span className="block text-2xl font-bold text-slate-900">{conversionRate}%</span>
						<span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">
							Konwersja
						</span>
					</div>
				</div>

				<div className="mt-4 space-y-2">
					<div className="flex justify-between items-center text-sm">
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 rounded-full bg-indigo-500"></div>
							<span className="text-slate-600">Premium</span>
						</div>
						<span className="font-semibold text-slate-900">
							{planData[1]?.value.toLocaleString('pl-PL') || 0}
						</span>
					</div>
					<div className="flex justify-between items-center text-sm">
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 rounded-full bg-slate-200"></div>
							<span className="text-slate-600">Darmowe</span>
						</div>
						<span className="font-semibold text-slate-900">
							{planData[0]?.value.toLocaleString('pl-PL') || 0}
						</span>
					</div>
				</div>
				</div>
			</div>

			{/* Wykresy Leadów */}
			{leadsBySource.length > 0 && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Wykres Leadów według źródła */}
					<div className="bg-white p-6 rounded-xl border border-slate-200">
						<h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
							<Users className="w-4 h-4 text-purple-600" />
							Leady według źródła
						</h3>
						<div className="h-[280px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={leadsBySource}
										cx="50%"
										cy="50%"
										labelLine={false}
										label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
										outerRadius={100}
										fill="#8884d8"
										dataKey="value"
									>
										{leadsBySource.map((entry, index) => (
											<Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
										))}
									</Pie>
									<Tooltip
										formatter={(value) => [typeof value === 'number' ? value.toLocaleString('pl-PL') : value, 'Leady']}
										contentStyle={{
											borderRadius: '8px',
											border: 'none',
											boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.1)',
										}}
									/>
								</PieChart>
							</ResponsiveContainer>
						</div>
						<div className="mt-4 grid grid-cols-2 gap-2">
							{leadsBySource.map((item, index) => (
								<div key={item.source} className="flex items-center justify-between text-sm">
									<div className="flex items-center gap-2">
										<div 
											className="w-3 h-3 rounded-full" 
											style={{ backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length] }}
										></div>
										<span className="text-slate-600 truncate">{item.name}</span>
									</div>
									<span className="font-semibold text-slate-900">{item.value}</span>
								</div>
							))}
						</div>
					</div>

					{/* Wykres Leadów w czasie (ostatnie 30 dni) */}
					{leadsDailyData.length > 0 && (
						<div className="bg-white p-6 rounded-xl border border-slate-200">
							<h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
								<TrendingUp className="w-4 h-4 text-purple-600" />
								Leady w czasie (ostatnie 30 dni)
							</h3>
							<div className="h-[280px] w-full">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={leadsDailyData}>
										<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
										<XAxis
											dataKey="name"
											axisLine={false}
											tickLine={false}
											tick={{ fill: '#94A3B8', fontSize: 11 }}
											angle={-45}
											textAnchor="end"
											height={80}
										/>
										<YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
										<Tooltip
											contentStyle={{
												borderRadius: '12px',
												border: 'none',
												boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
												backgroundColor: '#fff',
											}}
											labelStyle={{ fontWeight: 600 }}
										/>
										<Bar dataKey="leady" fill="#A855F7" radius={[8, 8, 0, 0]} name="Leady" />
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
