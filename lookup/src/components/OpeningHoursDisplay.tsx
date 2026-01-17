import { Calendar } from 'lucide-react'
import type { OpeningHours } from './OpeningHoursEditor'

const DAYS = [
	{ key: 'mon', label: 'Poniedziałek' },
	{ key: 'tue', label: 'Wtorek' },
	{ key: 'wed', label: 'Środa' },
	{ key: 'thu', label: 'Czwartek' },
	{ key: 'fri', label: 'Piątek' },
	{ key: 'sat', label: 'Sobota' },
	{ key: 'sun', label: 'Niedziela' },
] as const

interface OpeningHoursDisplayProps {
	hours: OpeningHours | null | undefined
}

export function OpeningHoursDisplay({ hours }: OpeningHoursDisplayProps) {
	// Domyślne godziny jeśli nie ustawione
	const defaultHours: OpeningHours = {
		mon: { open: '08:00', close: '17:00', closed: false },
		tue: { open: '08:00', close: '17:00', closed: false },
		wed: { open: '08:00', close: '17:00', closed: false },
		thu: { open: '08:00', close: '17:00', closed: false },
		fri: { open: '08:00', close: '17:00', closed: false },
		sat: { open: '09:00', close: '14:00', closed: false },
		sun: { open: '00:00', close: '00:00', closed: true },
	}

	const displayHours = hours || defaultHours

	// Grupuj dni z takimi samymi godzinami
	const groups: { days: string[]; schedule: string }[] = []
	let currentGroup: { days: string[]; schedule: string } | null = null

	DAYS.forEach(({ key, label }) => {
		const day = displayHours[key]
		const schedule = day.closed ? 'Zamknięte' : `${day.open} – ${day.close}`

		if (currentGroup && currentGroup.schedule === schedule) {
			currentGroup.days.push(label)
		} else {
			if (currentGroup) groups.push(currentGroup)
			currentGroup = { days: [label], schedule }
		}
	})
	if (currentGroup) groups.push(currentGroup)

	const formatDayRange = (days: string[]) => {
		if (days.length === 1) return days[0]
		if (days.length === 2) return `${days[0]}, ${days[1]}`
		return `${days[0]} – ${days[days.length - 1]}`
	}

	return (
		<div className='bg-white p-6 rounded-3xl shadow-sm border border-gray-100'>
			<h3 className='font-bold flex items-center gap-2 mb-4 text-gray-900'>
				<Calendar size={18} className='text-blue-600' /> Godziny otwarcia
			</h3>
			<div className='text-sm space-y-3'>
				{groups.map((group, idx) => (
					<div
						key={idx}
						className={`flex justify-between ${
							idx < groups.length - 1 ? 'border-b border-gray-50 pb-2' : ''
						} ${group.schedule === 'Zamknięte' ? 'text-gray-400' : ''}`}
					>
						<span className={group.schedule === 'Zamknięte' ? '' : 'text-gray-600'}>
							{formatDayRange(group.days)}
						</span>
						<span className={group.schedule === 'Zamknięte' ? '' : 'font-bold text-gray-900'}>
							{group.schedule}
						</span>
					</div>
				))}
			</div>
		</div>
	)
}
