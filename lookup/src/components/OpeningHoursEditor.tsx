'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'

export type DaySchedule = {
	open: string
	close: string
	closed: boolean
}

export type OpeningHours = {
	mon: DaySchedule
	tue: DaySchedule
	wed: DaySchedule
	thu: DaySchedule
	fri: DaySchedule
	sat: DaySchedule
	sun: DaySchedule
}

const DAYS = [
	{ key: 'mon', label: 'Poniedziałek' },
	{ key: 'tue', label: 'Wtorek' },
	{ key: 'wed', label: 'Środa' },
	{ key: 'thu', label: 'Czwartek' },
	{ key: 'fri', label: 'Piątek' },
	{ key: 'sat', label: 'Sobota' },
	{ key: 'sun', label: 'Niedziela' },
] as const

const DEFAULT_HOURS: OpeningHours = {
	mon: { open: '08:00', close: '17:00', closed: false },
	tue: { open: '08:00', close: '17:00', closed: false },
	wed: { open: '08:00', close: '17:00', closed: false },
	thu: { open: '08:00', close: '17:00', closed: false },
	fri: { open: '08:00', close: '17:00', closed: false },
	sat: { open: '09:00', close: '14:00', closed: false },
	sun: { open: '00:00', close: '00:00', closed: true },
}

interface OpeningHoursEditorProps {
	initialValue?: OpeningHours | null
	name: string
}

export function OpeningHoursEditor({ initialValue, name }: OpeningHoursEditorProps) {
	const [hours, setHours] = useState<OpeningHours>(initialValue || DEFAULT_HOURS)

	const updateDay = (day: keyof OpeningHours, field: keyof DaySchedule, value: string | boolean) => {
		setHours(prev => ({
			...prev,
			[day]: {
				...prev[day],
				[field]: value,
			},
		}))
	}

	const copyToWeekdays = (sourceDay: keyof OpeningHours) => {
		const source = hours[sourceDay]
		setHours(prev => ({
			...prev,
			mon: { ...source },
			tue: { ...source },
			wed: { ...source },
			thu: { ...source },
			fri: { ...source },
		}))
	}

	return (
		<div className='space-y-4'>
			<input type='hidden' name={name} value={JSON.stringify(hours)} />

			<div className='flex items-center justify-between mb-2'>
				<h3 className='text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2'>
					<Clock size={16} className='text-blue-600' /> Godziny otwarcia
				</h3>
				<button
					type='button'
					onClick={() => copyToWeekdays('mon')}
					className='text-xs text-blue-600 hover:text-blue-800 font-medium'
				>
					Skopiuj pon. na dni robocze
				</button>
			</div>

			<div className='bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100'>
				{DAYS.map(({ key, label }) => (
					<div key={key} className='flex items-center gap-3 p-3'>
						<div className='w-28 text-sm font-medium text-gray-700'>{label}</div>

						<label className='flex items-center gap-2 cursor-pointer'>
							<input
								type='checkbox'
								checked={hours[key].closed}
								onChange={e => updateDay(key, 'closed', e.target.checked)}
								className='w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
							/>
							<span className='text-xs text-gray-500'>Zamknięte</span>
						</label>

						{!hours[key].closed && (
							<div className='flex items-center gap-2 ml-auto'>
								<input
									type='time'
									value={hours[key].open}
									onChange={e => updateDay(key, 'open', e.target.value)}
									className='px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none'
								/>
								<span className='text-gray-400'>–</span>
								<input
									type='time'
									value={hours[key].close}
									onChange={e => updateDay(key, 'close', e.target.value)}
									className='px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none'
								/>
							</div>
						)}

						{hours[key].closed && (
							<span className='ml-auto text-sm text-gray-400 italic'>Zamknięte</span>
						)}
					</div>
				))}
			</div>
		</div>
	)
}
