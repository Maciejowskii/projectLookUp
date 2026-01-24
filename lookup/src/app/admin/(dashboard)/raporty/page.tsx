'use client'

import { useState } from 'react'
import {
	Building2,
	UserPlus,
	MessageSquare,
	ShieldCheck,
	Star,
	Phone,
	FileDown,
	Download,
} from 'lucide-react'

const tabs = [
	{
		id: 'new-companies',
		label: 'Założył sam wizytówkę',
		icon: UserPlus,
		description: 'Nowe logowanie - firmy utworzone przez formularz',
	},
	{
		id: 'reviews-left',
		label: 'Zostawił opinie',
		icon: MessageSquare,
		description: 'Użytkownicy którzy zostawili opinie',
	},
	{
		id: 'claims',
		label: 'Chciał przejąć wizytówkę',
		icon: ShieldCheck,
		description: 'Zgłoszenia przejęcia firm',
	},
	{
		id: 'companies-with-reviews',
		label: 'Ma opinie na profilu',
		icon: Star,
		description: 'Firmy z opiniami - dane kontaktowe i statystyki',
	},
	{
		id: 'phone-reveals',
		label: 'Wyświetlono numer firmy',
		icon: Phone,
		description: 'Firmy które otrzymały połączenia dzięki nam',
	},
]

export default function RaportyPage() {
	const [activeTab, setActiveTab] = useState(tabs[0].id)

	const handleExport = async (type: string) => {
		try {
			const response = await fetch(`/admin/raporty/export?type=${type}`)
			if (!response.ok) throw new Error('Błąd eksportu')

			const blob = await response.blob()
			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `raport-${type}-${new Date().toISOString().split('T')[0]}.csv`
			document.body.appendChild(a)
			a.click()
			window.URL.revokeObjectURL(url)
			document.body.removeChild(a)
		} catch (error) {
			console.error('Export error:', error)
			alert('Wystąpił błąd podczas eksportu danych')
		}
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold text-slate-900">Raporty i Eksporty</h1>
				<p className="text-slate-500 text-sm mt-1">Pobierz dane w formacie Excel (CSV)</p>
			</div>

			{/* Tabs */}
			<div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
				<div className="border-b border-slate-200">
					<div className="flex overflow-x-auto">
						{tabs.map((tab) => {
							const Icon = tab.icon
							const isActive = activeTab === tab.id
							return (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
										isActive
											? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
											: 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
									}`}
								>
									<Icon className="w-4 h-4" />
									{tab.label}
								</button>
							)
						})}
					</div>
				</div>

				{/* Tab Content */}
				<div className="p-6">
					{tabs.map((tab) => {
						if (activeTab !== tab.id) return null
						return (
							<div key={tab.id} className="space-y-4">
								<div>
									<p className="text-slate-600 text-sm">{tab.description}</p>
								</div>
								<div className="flex items-center gap-4">
									<button
										onClick={() => handleExport(tab.id)}
										className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
									>
										<Download className="w-4 h-4" />
										Pobierz plik Excel (CSV)
									</button>
									<span className="text-xs text-slate-500">
										Plik zostanie pobrany w formacie CSV, który można otworzyć w Excel
									</span>
								</div>
							</div>
						)
					})}
				</div>
			</div>

			{/* Info Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
					<div className="flex items-start gap-3">
						<FileDown className="w-5 h-5 text-blue-600 mt-0.5" />
						<div>
							<h3 className="font-semibold text-blue-900 mb-1">Format plików</h3>
							<p className="text-sm text-blue-700">
								Wszystkie pliki są eksportowane w formacie CSV, który można otworzyć w Excel, Google Sheets lub innym edytorze arkuszy kalkulacyjnych.
							</p>
						</div>
					</div>
				</div>
				<div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
					<div className="flex items-start gap-3">
						<ShieldCheck className="w-5 h-5 text-amber-600 mt-0.5" />
						<div>
							<h3 className="font-semibold text-amber-900 mb-1">Bezpieczeństwo danych</h3>
							<p className="text-sm text-amber-700">
								Eksport zawiera tylko dane niezbędne do analizy. Pamiętaj o bezpiecznym przechowywaniu pobranych plików.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
