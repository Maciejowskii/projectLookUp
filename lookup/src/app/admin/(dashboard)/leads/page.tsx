export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { Mail, Phone, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { LeadsImportForm } from '@/components/admin/LeadsImportForm'
import { LeadsCharts } from '@/components/admin/LeadsCharts'
import { LeadsExportForm } from '@/components/admin/LeadsExportForm'

export default async function LeadsPage() {
	const leads = await prisma.lead.findMany({
		orderBy: { createdAt: 'desc' },
		include: { company: true },
	})

	return (
		<div className='space-y-6'>
			<div className='flex justify-between items-end'>
				<div>
					<h1 className='text-2xl font-bold text-gray-900 tracking-tight'>Leady Użytkowników</h1>
					<p className='text-sm text-gray-500'>Osoby, które próbowały skontaktować się z firmami przez Twój portal.</p>
				</div>
				<div className='bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold border border-blue-100'>
					Total: {leads.length}
				</div>
			</div>

			{/* Eksport i Import */}
			<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
				<LeadsExportForm />
				<LeadsImportForm />
			</div>

			{/* Wykresy i statystyki */}
			{leads.length > 0 && <LeadsCharts leads={leads} />}

			<div className='bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden'>
				<table className='w-full text-left text-sm'>
					<thead className='bg-gray-50/50 text-gray-500 border-b border-gray-100'>
						<tr>
							<th className='px-6 py-4 font-semibold'>Klient (Kontakt)</th>
							<th className='px-6 py-4 font-semibold'>Szczegóły kontaktu</th>
							<th className='px-6 py-4 font-semibold'>Zainteresowany firmą</th>
							<th className='px-6 py-4 font-semibold'>Opis/Źródło</th>
							<th className='px-6 py-4 font-semibold'>Data</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-gray-100'>
						{leads.map(lead => (
							<tr key={lead.id} className='hover:bg-gray-50/80 transition-colors'>
								<td className='px-6 py-4'>
									<div className='flex items-center gap-3'>
										<div className='w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold border border-purple-200'>
											{lead.contactName.charAt(0)}
										</div>
										<span className='font-medium text-gray-900'>{lead.contactName}</span>
									</div>
								</td>
								<td className='px-6 py-4'>
									<div className='flex flex-col gap-1 text-gray-500'>
										<div className='flex items-center gap-2 text-xs'>
											<Mail size={12} /> {lead.email}
										</div>
										<div className='flex items-center gap-2 text-xs'>
											<Phone size={12} /> {lead.phone}
										</div>
									</div>
								</td>
								<td className='px-6 py-4'>
									{lead.company ? (
										<Link
											href={`/firma/${lead.company.slug}`}
											className='flex items-center gap-2 text-blue-600 font-medium hover:underline'
										>
											{lead.company.name}
											<ArrowRight size={14} className='opacity-50' />
										</Link>
									) : (
										<span className='text-red-400 italic'>Firma usunięta</span>
									)}
								</td>
								<td className='px-6 py-4 max-w-xs'>
									<div className='flex flex-col gap-1'>
										{lead.description && (
											<p className='text-xs text-gray-600 italic line-clamp-2' title={lead.description}>
												{lead.description}
											</p>
										)}
										{lead.source && (
											<span className='text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium w-fit'>
												{lead.source === 'PHONE_REVEAL' && 'Kliknięcie telefonu'}
												{lead.source === 'PHONE_REVEAL_LOGGED_IN' && 'Kliknięcie (zalogowany)'}
												{lead.source === 'REGISTRATION' && 'Rejestracja'}
												{lead.source === 'LOGIN' && 'Logowanie'}
												{lead.source === 'CONTACT_FORM' && 'Formularz kontaktowy'}
												{!['PHONE_REVEAL', 'PHONE_REVEAL_LOGGED_IN', 'REGISTRATION', 'LOGIN', 'CONTACT_FORM'].includes(lead.source) && lead.source}
											</span>
										)}
									</div>
								</td>
								<td className='px-6 py-4 text-gray-400 text-xs'>
									{new Date(lead.createdAt).toLocaleDateString('pl-PL', {
										day: 'numeric',
										month: 'short',
										year: 'numeric',
										hour: '2-digit',
										minute: '2-digit',
									})}
								</td>
							</tr>
						))}

						{leads.length === 0 && (
							<tr>
								<td colSpan={5} className='py-12 text-center text-gray-400'>
									Jeszcze nikt nie skontaktował się z żadną firmą.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	)
}
