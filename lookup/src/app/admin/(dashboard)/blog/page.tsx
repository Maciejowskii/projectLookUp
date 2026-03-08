export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import {
	deletePost,
	schedulePost,
	scheduleBulkTopics,
	generatePostAIForm,
	publishScheduledPost,
	cancelScheduledPost,
	runScheduledPostsManually,
} from '@/actions/blogActions'
import {
	Trash2,
	Sparkles,
	PenTool,
	Eye,
	Pencil,
	Clock,
	Calendar,
	Play,
	X,
	CheckCircle,
	AlertCircle,
	RefreshCw,
	Layers,
} from 'lucide-react'
import Link from 'next/link'
import { AIGeneratorForm } from '@/components/admin/AIGeneratorForm'

export default async function AdminBlogPage({
	searchParams,
}: {
	searchParams: Promise<{ error?: string; success?: string }>
}) {
	const params = await searchParams
	const [posts, scheduled] = await Promise.all([
		prisma.post.findMany({
			orderBy: { createdAt: 'desc' },
		}),
		prisma.scheduledPost.findMany({
			orderBy: { scheduledAt: 'asc' },
		}),
	])

	return (
		<div className='space-y-12'>
			{/* Komunikaty błędów/sukcesu */}
			{params.error && (
				<div className='p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3'>
					<AlertCircle className='text-red-600 flex-shrink-0' size={20} />
					<p className='text-red-800 font-medium'>{decodeURIComponent(params.error)}</p>
				</div>
			)}
			{params.success && (
				<div className='p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3'>
					<CheckCircle className='text-green-600 flex-shrink-0' size={20} />
					<p className='text-green-800 font-medium'>{decodeURIComponent(params.success)}</p>
				</div>
			)}

			<div className='flex justify-between items-end'>
				<div>
					<h1 className='text-2xl font-bold text-gray-900'>Zarządzanie Blogiem</h1>
					<p className='text-gray-500 text-sm'>Twórz treści, które przyciągną ruch z Google.</p>
				</div>
				<Link
					href='/blog'
					target='_blank'
					className='flex items-center gap-2 text-blue-600 text-sm font-bold hover:underline'
				>
					<Eye size={16} /> Podgląd bloga
				</Link>
			</div>

			{/* 3 karty: AI, ręcznie, planer */}
			<div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
				{/* KARTA 1: GENERATOR AI */}
				<div className='bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-sm'>
					<h2 className='font-bold text-indigo-900 flex items-center gap-2 mb-4'>
						<Sparkles className='text-purple-600' size={20} /> Generator AI (OpenAI)
					</h2>
					<AIGeneratorForm action={generatePostAIForm} />
				</div>

				{/* KARTA 2: DODAJ RĘCZNIE */}
				<div className='bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col'>
					<h2 className='font-bold text-gray-900 flex items-center gap-2 mb-4'>
						<PenTool className='text-gray-600' size={20} /> Dodaj ręcznie
					</h2>
					<p className='text-sm text-gray-500 mb-3 grow'>
						Stwórz wpis blogowy ręcznie z pełnym edytorem HTML i podglądem na żywo.
					</p>
					<ul className='text-xs text-gray-500 space-y-1.5 mb-6'>
						<li className='flex items-center gap-2'>
							<Eye size={12} className='text-blue-500' /> Podgląd HTML w czasie rzeczywistym
						</li>
						<li className='flex items-center gap-2'>
							<PenTool size={12} className='text-blue-500' /> Gotowe snippety HTML do wstawienia
						</li>
						<li className='flex items-center gap-2'>
							<Pencil size={12} className='text-blue-500' /> Podzielony widok edytor + podgląd
						</li>
					</ul>
					<Link
						href='/admin/blog/new'
						className='w-full bg-gray-900 text-white font-bold py-3 rounded-xl text-sm hover:bg-black transition-colors flex items-center justify-center gap-2'
					>
						<PenTool size={16} /> Otwórz edytor
					</Link>
				</div>

				{/* ✅ KARTA 3: PLANER WPISÓW AI - ULEPSZONY */}
				<div className='bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-2xl border border-blue-100 shadow-sm'>
					<div className='flex items-center justify-between mb-4'>
						<h2 className='font-bold text-blue-900 flex items-center gap-2'>
							<Calendar className='text-blue-600' size={20} /> Planer wpisów AI
						</h2>
						{/* Przycisk uruchomienia CRON ręcznie */}
						<form action={runScheduledPostsManually}>
							<button
								type='submit'
								className='flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors'
								title='Uruchom wszystkie zaległe posty natychmiast'
							>
								<RefreshCw size={14} /> Uruchom CRON
							</button>
						</form>
					</div>

					{/* Formularz planowania */}
					<form action={schedulePost} className='space-y-3 mb-6'>
						<input
							name='topic'
							required
							placeholder='Temat artykułu AI'
							className='w-full p-3 border border-blue-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white placeholder:text-gray-600'
						/>
						<div className='grid grid-cols-2 gap-2'>
							<div className='relative'>
								<Calendar size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-blue-400' />
								<input
									type='date'
									name='date'
									required
									min={new Date().toISOString().split('T')[0]}
									className='w-full p-3 pl-9 border border-blue-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white placeholder:text-gray-600'
								/>
							</div>
							<div className='relative'>
								<Clock size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-blue-400' />
								<input
									type='time'
									name='time'
									required
									defaultValue='08:00'
									className='w-full p-3 pl-9 border border-blue-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white placeholder:text-gray-600'
								/>
							</div>
						</div>
						<button className='w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200'>
							<Calendar size={16} /> Zaplanuj publikację
						</button>
					</form>

					{/* Dodaj masowo tematy */}
					<div className='mt-6 pt-6 border-t border-blue-100'>
						<h3 className='font-semibold text-blue-900 flex items-center gap-2 mb-3'>
							<Layers className='text-blue-600' size={18} /> Dodaj masowo tematy
						</h3>
						<p className='text-xs text-blue-700/80 mb-3'>
							Tematy zostaną zaplanowane na 8:00, 12:00 i 18:00 w kolejnych dniach (3 wpisy dziennie). Start od jutra.
						</p>
						<form action={scheduleBulkTopics} className='space-y-3'>
							<div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
								<div>
									<label className='block text-xs font-medium text-blue-800 mb-1'>Liczba tematów</label>
									<input
										type='number'
										name='count'
										min={1}
										max={500}
										placeholder='np. 90'
										className='w-full p-3 border border-blue-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white placeholder:text-gray-600'
									/>
								</div>
								<div className='sm:col-span-2'>
									<label className='block text-xs font-medium text-blue-800 mb-1'>
										Lub wklej tematy (jeden per linia) — ma pierwszeństwo
									</label>
									<textarea
										name='topics'
										rows={4}
										placeholder={'Jeden temat per linia\nnp. Jak naprawić kran\nSEO dla firm\n...'}
										className='w-full p-3 border border-blue-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white font-mono placeholder:text-gray-600'
									/>
								</div>
							</div>
							<button
								type='submit'
								className='w-full bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-blue-800 transition-all flex items-center justify-center gap-2'
							>
								<Layers size={16} /> Zaplanuj masowo (8:00, 12:00, 18:00)
							</button>
						</form>
					</div>

					{/* Lista zaplanowanych postów */}
					<div className='space-y-3'>
						<h3 className='text-xs font-bold text-blue-600 uppercase tracking-wide flex items-center gap-2'>
							<Clock size={12} /> Zaplanowane ({scheduled.filter(s => s.status === 'scheduled').length})
						</h3>

						<div className='space-y-2 max-h-64 overflow-y-auto'>
							{scheduled
								.filter(s => s.status === 'scheduled')
								.map(s => {
									const scheduledDate = new Date(s.scheduledAt)
									const isPast = scheduledDate < new Date()

									return (
										<div
											key={s.id}
											className={`p-4 rounded-xl border transition-all ${
												isPast ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'
											}`}
										>
											<div className='flex items-start justify-between gap-3'>
												<div className='flex-1 min-w-0'>
													<div className='font-semibold text-gray-900 text-sm mb-1 line-clamp-2'>{s.topic}</div>
													<div
														className={`text-xs flex items-center gap-1 ${
															isPast ? 'text-amber-600 font-semibold' : 'text-gray-500'
														}`}
													>
														<Calendar size={12} />
														{scheduledDate.toLocaleDateString('pl-PL', {
															weekday: 'short',
															day: 'numeric',
															month: 'short',
														})}
														<span className='mx-1'>•</span>
														<Clock size={12} />
														{scheduledDate.toLocaleTimeString('pl-PL', {
															hour: '2-digit',
															minute: '2-digit',
														})}
														{isPast && (
															<span className='ml-2 px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded text-[10px] font-bold'>
																ZALEGŁY
															</span>
														)}
													</div>
												</div>
												<div className='flex flex-col gap-1'>
													<form action={publishScheduledPost}>
														<input type='hidden' name='id' value={s.id} />
														<button
															type='submit'
															className='flex items-center gap-1 px-2.5 py-1.5 bg-green-500 text-white text-xs rounded-lg font-bold hover:bg-green-600 transition-colors w-full justify-center'
															title='Opublikuj natychmiast'
														>
															<Play size={12} /> Teraz
														</button>
													</form>
													<form action={cancelScheduledPost}>
														<input type='hidden' name='id' value={s.id} />
														<button
															type='submit'
															className='flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg font-bold hover:bg-red-100 hover:text-red-600 transition-colors w-full justify-center'
															title='Anuluj'
														>
															<X size={12} /> Anuluj
														</button>
													</form>
												</div>
											</div>
										</div>
									)
								})}

							{scheduled.filter(s => s.status === 'scheduled').length === 0 && (
								<div className='text-center py-8'>
									<Calendar className='mx-auto text-blue-300 mb-2' size={32} />
									<p className='text-gray-500 text-sm'>Brak zaplanowanych wpisów</p>
									<p className='text-gray-500 text-xs'>Użyj formularza powyżej, aby zaplanować artykuł AI</p>
								</div>
							)}
						</div>
					</div>

					{/* Historia wykonań */}
					{scheduled.filter(s => s.status !== 'scheduled').length > 0 && (
						<div className='mt-6 pt-4 border-t border-blue-100'>
							<h3 className='text-xs font-bold text-gray-500 uppercase tracking-wide mb-3'>Historia publikacji</h3>
							<div className='space-y-2'>
								{scheduled
									.filter(s => s.status !== 'scheduled')
									.slice(0, 5)
									.map(s => (
										<div key={s.id} className='flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg'>
											<div className='flex items-center gap-2 min-w-0'>
												{s.status === 'done' ? (
													<CheckCircle size={14} className='text-green-500 flex-shrink-0' />
												) : s.status === 'processing' ? (
													<RefreshCw size={14} className='text-blue-500 animate-spin flex-shrink-0' />
												) : (
													<AlertCircle size={14} className='text-red-500 flex-shrink-0' />
												)}
												<span className='text-sm text-gray-700 truncate'>{s.topic}</span>
											</div>
											<div className='flex items-center gap-2 flex-shrink-0'>
												<span
													className={`text-xs font-mono px-2 py-0.5 rounded ${
														s.status === 'done'
															? 'bg-green-100 text-green-700'
															: s.status === 'processing'
																? 'bg-blue-100 text-blue-700'
																: 'bg-red-100 text-red-700'
													}`}
												>
													{s.status === 'done' ? 'OK' : s.status === 'processing' ? '...' : 'BŁĄD'}
												</span>
												<span className='text-xs text-gray-500'>
													{new Date(s.executedAt || s.scheduledAt).toLocaleDateString('pl-PL')}
												</span>
											</div>
										</div>
									))}
							</div>
						</div>
					)}

					{/* Info o CRON */}
					<div className='mt-4 p-3 bg-blue-100/50 rounded-lg'>
						<p className='text-xs text-blue-700'>
							<strong>💡 Tip:</strong> Automatyczna publikacja wymaga zewnętrznego CRON-a wywołującego{' '}
							<code className='bg-blue-200 px-1 rounded'>/api/cron/publish</code> co 15 min. Możesz też użyć przycisku
							"Uruchom CRON" powyżej.
						</p>
					</div>
				</div>
			</div>

			{/* LISTA POSTÓW - bez zmian */}
			<div className='bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden'>
				<table className='w-full text-left text-sm'>
					<thead className='bg-gray-50 border-b border-gray-100'>
						<tr>
							<th className='p-4 font-semibold text-gray-600'>Tytuł artykułu</th>
							<th className='p-4 font-semibold text-gray-600'>Data</th>
							<th className='p-4 font-semibold text-gray-600 text-right'>Akcje</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-gray-100'>
						{posts.map(post => (
							<tr key={post.id} className='hover:bg-gray-50'>
								<td className='p-4 font-medium text-gray-900'>
									{post.title}
									<span className='block text-xs text-gray-500 font-normal truncate max-w-xs'>{post.slug}</span>
								</td>
								<td className='p-4 text-gray-500'>{new Date(post.createdAt).toLocaleDateString()}</td>
								<td className='p-4 text-right flex justify-end gap-2'>
									<Link
										href={`/admin/blog/${post.id}/edit`}
										className='text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors'
									>
										<Pencil size={18} />
									</Link>
									<form action={deletePost.bind(null, post.id)} className='inline'>
										<button className='text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors'>
											<Trash2 size={18} />
										</button>
									</form>
								</td>
							</tr>
						))}
						{posts.length === 0 && (
							<tr>
								<td colSpan={3} className='p-8 text-center text-gray-500'>
									Brak postów. Użyj generatora AI powyżej!
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	)
}
