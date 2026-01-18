export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { ClipboardList, User, Clock, ArrowRight, Search, Filter } from 'lucide-react'

// Mapowanie akcji na polskie nazwy
const ACTION_LABELS: Record<string, { label: string; color: string }> = {
	ADMIN_LOGIN: { label: 'Logowanie', color: 'bg-blue-100 text-blue-700' },
	ADMIN_LOGOUT: { label: 'Wylogowanie', color: 'bg-slate-100 text-slate-700' },
	APPROVE_CLAIM: { label: 'Akceptacja przejęcia', color: 'bg-green-100 text-green-700' },
	REJECT_CLAIM: { label: 'Odrzucenie przejęcia', color: 'bg-red-100 text-red-700' },
	DELETE_REVIEW: { label: 'Usunięcie opinii', color: 'bg-red-100 text-red-700' },
	CREATE_CATEGORY: { label: 'Utworzenie kategorii', color: 'bg-purple-100 text-purple-700' },
	DELETE_CATEGORY: { label: 'Usunięcie kategorii', color: 'bg-red-100 text-red-700' },
	UPDATE_CATEGORY: { label: 'Aktualizacja kategorii', color: 'bg-amber-100 text-amber-700' },
	UPDATE_SETTINGS: { label: 'Zmiana ustawień', color: 'bg-amber-100 text-amber-700' },
	DELETE_COMPANY: { label: 'Usunięcie firmy', color: 'bg-red-100 text-red-700' },
	VERIFY_COMPANY: { label: 'Weryfikacja firmy', color: 'bg-green-100 text-green-700' },
	UNVERIFY_COMPANY: { label: 'Cofnięcie weryfikacji', color: 'bg-orange-100 text-orange-700' },
	SET_PREMIUM: { label: 'Nadanie Premium', color: 'bg-amber-100 text-amber-700' },
	REMOVE_PREMIUM: { label: 'Usunięcie Premium', color: 'bg-slate-100 text-slate-700' },
}

export default async function AuditLogPage({
	searchParams,
}: {
	searchParams: Promise<{ action?: string; page?: string }>
}) {
	const { action, page } = await searchParams
	const currentPage = parseInt(page || '1', 10)
	const pageSize = 50

	// Pobierz logi z filtrowaniem
	const where = action ? { action } : {}

	const [logs, totalLogs, uniqueActions] = await Promise.all([
		prisma.adminAuditLog.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			take: pageSize,
			skip: (currentPage - 1) * pageSize,
			include: {
				user: {
					select: { email: true, name: true },
				},
			},
		}),
		prisma.adminAuditLog.count({ where }),
		prisma.adminAuditLog.groupBy({
			by: ['action'],
			_count: true,
		}),
	])

	const totalPages = Math.ceil(totalLogs / pageSize)

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
						<ClipboardList className="w-6 h-6 text-slate-400" />
						Audit Log
					</h1>
					<p className="text-sm text-slate-500 mt-1">
						Historia wszystkich operacji administratorów ({totalLogs.toLocaleString('pl-PL')} wpisów)
					</p>
				</div>

				{/* Filters */}
				<div className="flex items-center gap-3">
					<form className="flex items-center gap-2" method="GET">
						<Filter className="w-4 h-4 text-slate-400" />
						<select
							name="action"
							defaultValue={action || ''}
							className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
						>
							<option value="">Wszystkie akcje</option>
							{uniqueActions.map((a) => (
								<option key={a.action} value={a.action}>
									{ACTION_LABELS[a.action]?.label || a.action} ({a._count})
								</option>
							))}
						</select>
						<button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
							Filtruj
						</button>
						{action && (
							<a href="/admin/audit" className="px-3 py-2 text-slate-500 hover:text-slate-700 text-sm">
								Wyczyść
							</a>
						)}
					</form>
				</div>
			</div>

			{/* Logs Table */}
			<div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
							<tr>
								<th className="px-6 py-4 font-semibold">Czas</th>
								<th className="px-6 py-4 font-semibold">Administrator</th>
								<th className="px-6 py-4 font-semibold">Akcja</th>
								<th className="px-6 py-4 font-semibold">Szczegóły</th>
								<th className="px-6 py-4 font-semibold">IP</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
								{logs.map((log) => {
								const actionInfo = ACTION_LABELS[log.action] || {
									label: log.action,
									color: 'bg-slate-100 text-slate-700',
								}
								const details = log.details as Record<string, string | number | object | null> | null
								const companyName = details?.companyName as string | undefined
								const itemName = details?.name as string | undefined
								const claimEmail = details?.claimEmail as string | undefined
								const oldName = details?.oldName as string | undefined
								const newName = details?.newName as string | undefined
								const changes = details?.changes as Record<string, unknown> | undefined

								return (
									<tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="flex items-center gap-2 text-slate-600">
												<Clock className="w-4 h-4 text-slate-400" />
												<span>
													{new Date(log.createdAt).toLocaleString('pl-PL', {
														day: '2-digit',
														month: '2-digit',
														year: 'numeric',
														hour: '2-digit',
														minute: '2-digit',
														second: '2-digit',
													})}
												</span>
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="flex items-center gap-2">
												<div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
													{log.user.name?.charAt(0) || log.user.email.charAt(0).toUpperCase()}
												</div>
												<div>
													<p className="font-medium text-slate-900">{log.user.name || 'Admin'}</p>
													<p className="text-xs text-slate-500">{log.user.email}</p>
												</div>
											</div>
										</td>
										<td className="px-6 py-4">
											<span
												className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${actionInfo.color}`}
											>
												{actionInfo.label}
											</span>
										</td>
										<td className="px-6 py-4">
											{details ? (
												<div className="max-w-xs">
													{companyName && (
														<p className="text-slate-700 truncate">
															Firma: <strong>{companyName}</strong>
														</p>
													)}
													{itemName && !companyName && (
														<p className="text-slate-700 truncate">
															Nazwa: <strong>{itemName}</strong>
														</p>
													)}
													{claimEmail && (
														<p className="text-xs text-slate-500 truncate">
															Email: {claimEmail}
														</p>
													)}
													{oldName && newName && (
														<p className="text-xs text-slate-500">
															{oldName} → {newName}
														</p>
													)}
													{changes && (
														<p className="text-xs text-slate-500">
															Zmieniono {Object.keys(changes).length} ustawień
														</p>
													)}
												</div>
											) : log.target ? (
												<span className="text-slate-500 text-xs font-mono">{log.target}</span>
											) : (
												<span className="text-slate-400">—</span>
											)}
										</td>
										<td className="px-6 py-4">
											<span className="text-slate-500 text-xs font-mono">{log.ipAddress || '—'}</span>
										</td>
									</tr>
								)
							})}

							{logs.length === 0 && (
								<tr>
									<td colSpan={5} className="py-12 text-center text-slate-400">
										<ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-200" />
										<p>Brak wpisów w logu</p>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
						<p className="text-sm text-slate-500">
							Strona {currentPage} z {totalPages}
						</p>
						<div className="flex gap-2">
							{currentPage > 1 && (
								<a
									href={`/admin/audit?page=${currentPage - 1}${action ? `&action=${action}` : ''}`}
									className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
								>
									Poprzednia
								</a>
							)}
							{currentPage < totalPages && (
								<a
									href={`/admin/audit?page=${currentPage + 1}${action ? `&action=${action}` : ''}`}
									className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
								>
									Następna
								</a>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
