export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { createCategory, deleteCategory, updateCategory } from '@/actions/adminActions'
import { useState, useRef } from 'react'
import { FolderPlus, Trash2, Layers, Edit3, Check, X } from 'lucide-react'

export default async function AdminCategoriesPage() {
	const categories = await prisma.category.findMany({
		orderBy: { name: 'asc' },
		include: { _count: { select: { companies: true } } },
	})

	return <CategoriesAdmin categories={categories} />
}

function CategoriesAdmin({ categories }: { categories: any[] }) {
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editName, setEditName] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)

	const handleEdit = (cat: any) => {
		setEditingId(cat.id)
		setEditName(cat.name)
		// Auto-focus po renderze
		setTimeout(() => inputRef.current?.focus(), 100)
	}

	const handleCancel = () => {
		setEditingId(null)
		setEditName('')
	}

	return (
		<div className='space-y-8'>
			<div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
				<div>
					<h1 className='text-2xl font-bold text-gray-900'>Kategorie Branżowe</h1>
					<p className='text-sm text-gray-500'>Definiuj branże, aby poprawić SEO i nawigację.</p>
				</div>

				<form action={createCategory} className='flex gap-2 w-full md:w-auto'>
					<input
						name='name'
						required
						placeholder='Nowa kategoria (np. Hydraulik)'
						className='px-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64'
					/>
					<button className='bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap'>
						<FolderPlus size={18} /> Dodaj
					</button>
				</form>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
				{categories.map(cat => {
					const isEditing = editingId === cat.id

					return (
						<div
							key={cat.id}
							className={`bg-white p-6 rounded-xl shadow-sm border transition-all group hover:shadow-md ${
								isEditing
									? 'border-blue-500 ring-2 ring-blue-200 ring-opacity-50 shadow-2xl'
									: 'border-gray-200 hover:border-blue-300'
							}`}
						>
							<div className='flex items-center justify-between gap-4'>
								{/* Ikona + Nazwa/Edycja */}
								<div className='flex items-center gap-3 flex-1 min-w-0'>
									<div
										className={`p-2 rounded-lg flex-shrink-0 ${
											isEditing ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-blue-50 text-blue-600'
										}`}
									>
										<Layers size={20} />
									</div>

									{isEditing ? (
										<div className='flex-1 min-w-0'>
											<input
												ref={inputRef}
												value={editName}
												onChange={e => setEditName(e.target.value)}
												className='w-full px-3 py-2 text-lg font-bold text-gray-900 bg-transparent border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all'
												placeholder='Nazwa kategorii'
											/>
											<p className='text-xs text-gray-500 mt-1 truncate'>
												/{cat.slug} • {cat._count.companies} firm
											</p>
										</div>
									) : (
										<div className='min-w-0 flex-1'>
											<h3 className='font-bold text-lg text-gray-900 truncate pr-2'>{cat.name}</h3>
											<p className='text-xs text-gray-500 truncate'>
												/{cat.slug} • {cat._count.companies} firm
											</p>
										</div>
									)}
								</div>

								{/* Przyciski akcji */}
								<div className='flex items-center gap-1 flex-shrink-0'>
									{isEditing ? (
										<>
											{/* Zapisz */}
											<form action={updateCategory} className='flex-shrink-0'>
												<input type='hidden' name='id' value={cat.id} />
												<input type='hidden' name='name' value={editName} />
												<button
													type='submit'
													className='p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-all shadow-sm hover:shadow-md'
													title='Zapisz zmiany'
												>
													<Check size={18} />
												</button>
											</form>

											{/* Anuluj */}
											<button
												type='button'
												onClick={handleCancel}
												className='p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all shadow-sm hover:shadow-md'
												title='Anuluj'
											>
												<X size={18} />
											</button>
										</>
									) : (
										<>
											{/* Edytuj */}
											<button
												type='button'
												onClick={() => handleEdit(cat)}
												className='p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm hover:shadow-md opacity-0 group-hover:opacity-100'
												title='Edytuj nazwę'
											>
												<Edit3 size={18} />
											</button>

											{/* Usuń */}
											<form action={deleteCategory.bind(null, cat.id)} className='ml-1'>
												<button
													className='p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shadow-sm hover:shadow-md'
													title='Usuń kategorię'
												>
													<Trash2 size={18} />
												</button>
											</form>
										</>
									)}
								</div>
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}
