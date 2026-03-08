'use client'

import { useState, useCallback, useRef } from 'react'
import { createPost, updatePost } from '@/actions/blogActions'
import {
	Eye,
	Code,
	Save,
	ArrowLeft,
	AlertCircle,
	CheckCircle,
	Loader2,
	FileText,
	Maximize2,
	Minimize2,
	ChevronDown,
	ChevronUp,
	Type,
	List,
	Link2,
	Quote,
	Minus,
	ImageIcon,
	Table,
	AlignLeft,
} from 'lucide-react'
import Link from 'next/link'

interface BlogPostEditorProps {
	mode: 'create' | 'edit'
	initialData?: {
		id: string
		title: string
		excerpt: string
		content: string
		image: string | null
	}
}

const HTML_SNIPPETS = [
	{
		label: 'Nagłówek H2',
		icon: Type,
		code: '<h2 class="text-2xl font-bold mt-10 mb-4 text-gray-900">Tytuł sekcji</h2>',
	},
	{
		label: 'Nagłówek H3',
		icon: Type,
		code: '<h3 class="text-xl font-semibold mt-8 mb-3 text-gray-800">Podtytuł</h3>',
	},
	{
		label: 'Akapit',
		icon: AlignLeft,
		code: '<p class="mb-6 leading-relaxed text-gray-700">Treść akapitu...</p>',
	},
	{
		label: 'Lista punktowa',
		icon: List,
		code: '<ul class="list-disc ml-6 mb-6 text-gray-700">\n  <li class="mb-2">Element 1</li>\n  <li class="mb-2">Element 2</li>\n  <li class="mb-2">Element 3</li>\n</ul>',
	},
	{
		label: 'Obrazek',
		icon: ImageIcon,
		code: '<img src="URL_OBRAZKA" alt="Opis obrazka" class="w-full h-64 object-cover rounded-2xl my-8 shadow-lg" />',
	},
	{
		label: 'Link',
		icon: Link2,
		code: '<a href="https://example.com" class="text-blue-600 hover:underline font-medium">Tekst linku</a>',
	},
	{
		label: 'Cytat',
		icon: Quote,
		code: '<blockquote class="border-l-4 border-blue-500 pl-6 py-4 my-8 bg-blue-50 rounded-r-xl">\n  <p class="text-gray-700 italic">Treść cytatu...</p>\n</blockquote>',
	},
	{
		label: 'Separator',
		icon: Minus,
		code: '<hr class="my-10 border-gray-200" />',
	},
	{
		label: 'Pogrubienie',
		icon: Type,
		code: '<strong>pogrubiony tekst</strong>',
	},
	{
		label: 'Tabela',
		icon: Table,
		code: '<table class="w-full border-collapse mb-8">\n  <thead>\n    <tr class="bg-gray-100">\n      <th class="border border-gray-200 px-4 py-2 text-left">Kolumna 1</th>\n      <th class="border border-gray-200 px-4 py-2 text-left">Kolumna 2</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td class="border border-gray-200 px-4 py-2">Dane 1</td>\n      <td class="border border-gray-200 px-4 py-2">Dane 2</td>\n    </tr>\n  </tbody>\n</table>',
	},
	{
		label: 'Sekcja z ID',
		icon: FileText,
		code: '<section id="section-0">\n  <h2 id="section-0" class="text-2xl font-bold mt-10 mb-4 text-gray-900">Tytuł sekcji</h2>\n  <p class="mb-6 leading-relaxed text-gray-700">Treść sekcji...</p>\n</section>',
	},
	{
		label: 'Spis treści',
		icon: List,
		code: '<nav class="bg-linear-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl mb-10 border border-blue-100">\n  <h3 class="font-bold text-lg mb-4 text-gray-900">Spis treści</h3>\n  <ul class="space-y-2">\n    <li><a href="#section-0" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">1. Pierwsza sekcja</a></li>\n    <li><a href="#section-1" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">2. Druga sekcja</a></li>\n    <li><a href="#section-2" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">3. Trzecia sekcja</a></li>\n  </ul>\n</nav>',
	},
]

export default function BlogPostEditor({ mode, initialData }: BlogPostEditorProps) {
	const [title, setTitle] = useState(initialData?.title || '')
	const [excerpt, setExcerpt] = useState(initialData?.excerpt || '')
	const [content, setContent] = useState(initialData?.content || '')
	const [image, setImage] = useState(initialData?.image || '')
	const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'split'>('split')
	const [isFullscreen, setIsFullscreen] = useState(false)
	const [saving, setSaving] = useState(false)
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
	const [showSnippets, setShowSnippets] = useState(false)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const insertSnippet = useCallback(
		(code: string) => {
			const textarea = textareaRef.current
			if (textarea) {
				const start = textarea.selectionStart
				const end = textarea.selectionEnd
				const before = content.substring(0, start)
				const after = content.substring(end)
				const separator = before && !before.endsWith('\n') ? '\n\n' : before ? '\n' : ''
				const newContent = before + separator + code + after
				setContent(newContent)
				requestAnimationFrame(() => {
					const newPos = (before + separator + code).length
					textarea.selectionStart = newPos
					textarea.selectionEnd = newPos
					textarea.focus()
				})
			} else {
				setContent(prev => prev + (prev ? '\n\n' : '') + code)
			}
		},
		[content],
	)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setSaving(true)
		setMessage(null)

		const formData = new FormData()
		formData.set('title', title.trim())
		formData.set('excerpt', excerpt.trim())
		formData.set('content', content)
		formData.set('image', image.trim())

		try {
			if (mode === 'create') {
				const result = await createPost(formData)
				if (result?.error) {
					setMessage({ type: 'error', text: result.error })
					setSaving(false)
				}
			} else {
				formData.set('id', initialData!.id)
				const result = await updatePost(formData)
				if (result.error) {
					setMessage({ type: 'error', text: result.error })
				} else if (result.success) {
					setMessage({ type: 'success', text: result.success })
				}
				setSaving(false)
			}
		} catch {
			setMessage({ type: 'error', text: 'Wystąpił nieoczekiwany błąd' })
			setSaving(false)
		}
	}

	const wordCount = content
		.replace(/<[^>]*>/g, '')
		.trim()
		.split(/\s+/)
		.filter(Boolean).length
	const readingTime = Math.max(1, Math.ceil(wordCount / 200))

	const tabs = [
		{ id: 'editor' as const, label: 'HTML', icon: Code },
		{ id: 'split' as const, label: 'Podzielony', icon: FileText },
		{ id: 'preview' as const, label: 'Podgląd', icon: Eye },
	]

	return (
		<div className={isFullscreen ? 'fixed inset-0 z-50 bg-gray-50 overflow-y-auto' : ''}>
			<form onSubmit={handleSubmit} className='space-y-6'>
				{/* Header bar */}
				<div className='flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-gray-200 shadow-sm'>
					<div className='flex items-center gap-4'>
						<Link
							href='/admin/blog'
							className='flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium'
						>
							<ArrowLeft size={18} />
							Wróć
						</Link>
						<div className='h-5 w-px bg-gray-300' />
						<h1 className='text-lg font-bold text-gray-900'>
							{mode === 'edit' ? 'Edytuj wpis' : 'Nowy wpis blogowy'}
						</h1>
					</div>

					<div className='flex items-center gap-3'>
						<span className='text-xs text-gray-500 hidden sm:inline'>
							{wordCount} słów &bull; ~{readingTime} min czytania
						</span>
						<button
							type='button'
							onClick={() => setIsFullscreen(!isFullscreen)}
							className='p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors'
							title={isFullscreen ? 'Zamknij pełny ekran' : 'Pełny ekran'}
						>
							{isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
						</button>
						<button
							type='submit'
							disabled={saving || !title.trim() || !content.trim()}
							className='flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200'
						>
							{saving ? (
								<>
									<Loader2 size={16} className='animate-spin' /> Zapisuję...
								</>
							) : (
								<>
									<Save size={16} /> {mode === 'edit' ? 'Zapisz zmiany' : 'Opublikuj'}
								</>
							)}
						</button>
					</div>
				</div>

				{/* Status message */}
				{message && (
					<div
						className={`mx-6 p-4 rounded-xl flex items-center gap-3 ${
							message.type === 'success'
								? 'bg-green-50 border border-green-200'
								: 'bg-red-50 border border-red-200'
						}`}
					>
						{message.type === 'success' ? (
							<CheckCircle className='text-green-600 shrink-0' size={20} />
						) : (
							<AlertCircle className='text-red-600 shrink-0' size={20} />
						)}
						<p
							className={`font-medium text-sm ${
								message.type === 'success' ? 'text-green-800' : 'text-red-800'
							}`}
						>
							{message.text}
						</p>
					</div>
				)}

				{/* Meta fields */}
				<div className='mx-6 bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm'>
					<div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
						<div className='lg:col-span-2'>
							<label className='block text-sm font-semibold text-gray-700 mb-1.5'>
								Tytuł artykułu
								<span className='ml-2 text-xs font-normal text-gray-500'>{title.length}/100</span>
							</label>
							<input
								value={title}
								onChange={e => setTitle(e.target.value)}
								placeholder='Wpisz tytuł artykułu...'
								className='w-full px-4 py-3 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all'
								required
							/>
						</div>
						<div>
							<label className='block text-sm font-semibold text-gray-700 mb-1.5'>
								URL obrazka głównego
							</label>
							<input
								value={image}
								onChange={e => setImage(e.target.value)}
								placeholder='https://...'
								className='w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all'
							/>
						</div>
					</div>

					<div>
						<label className='block text-sm font-semibold text-gray-700 mb-1.5'>
							Zajawka (excerpt)
							<span className='ml-2 text-xs font-normal text-gray-500'>{excerpt.length}/160</span>
						</label>
						<textarea
							value={excerpt}
							onChange={e => setExcerpt(e.target.value)}
							placeholder='Krótki opis artykułu widoczny na liście bloga i w wynikach wyszukiwania...'
							rows={2}
							className='w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none'
						/>
					</div>

					{image && (
						<div>
							<p className='text-xs text-gray-500 mb-2'>Podgląd obrazka:</p>
							<div className='relative w-full h-32 rounded-xl overflow-hidden bg-gray-100 border border-gray-200'>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={image}
									alt='Podgląd'
									className='w-full h-full object-cover'
									onError={e => {
										;(e.target as HTMLImageElement).style.display = 'none'
									}}
								/>
							</div>
						</div>
					)}
				</div>

				{/* Content editor */}
				<div className='mx-6 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm'>
					{/* Tab bar */}
					<div className='flex items-center justify-between border-b border-gray-200 px-4'>
						<div className='flex'>
							{tabs.map(tab => (
								<button
									key={tab.id}
									type='button'
									onClick={() => setActiveTab(tab.id)}
									className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
										activeTab === tab.id
											? 'border-blue-500 text-blue-600'
											: 'border-transparent text-gray-500 hover:text-gray-700'
									}`}
								>
									<tab.icon size={16} /> {tab.label}
								</button>
							))}
						</div>

						<div className='flex items-center gap-3'>
							<button
								type='button'
								onClick={() => setShowSnippets(!showSnippets)}
								className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
									showSnippets
										? 'bg-blue-100 text-blue-700'
										: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
								}`}
							>
								Wstaw HTML{' '}
								{showSnippets ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
							</button>
							<span className='text-xs text-gray-500 hidden sm:inline'>{content.length} znaków</span>
						</div>
					</div>

					{/* Snippets panel */}
					{showSnippets && (
						<div className='border-b border-gray-200 bg-gray-50 p-3'>
							<div className='flex flex-wrap gap-2'>
								{HTML_SNIPPETS.map(snippet => (
									<button
										key={snippet.label}
										type='button'
										onClick={() => insertSnippet(snippet.code)}
										className='flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors shadow-sm'
									>
										<snippet.icon size={14} />
										{snippet.label}
									</button>
								))}
							</div>
							<p className='text-[11px] text-gray-500 mt-2'>
								Kliknij snippet, aby wstawić go w miejscu kursora w edytorze HTML.
							</p>
						</div>
					)}

					{/* Content area */}
					<div
						className={
							activeTab === 'split' ? 'grid grid-cols-1 lg:grid-cols-2 divide-x divide-gray-200' : ''
						}
					>
						{/* Editor pane */}
						{(activeTab === 'editor' || activeTab === 'split') && (
							<div className='relative'>
								<textarea
									ref={textareaRef}
									value={content}
									onChange={e => setContent(e.target.value)}
									placeholder={
										'<h2 class="text-2xl font-bold mt-10 mb-4 text-gray-900">Tytuł sekcji</h2>\n\n<p class="mb-6 leading-relaxed text-gray-700">Treść artykułu...</p>\n\nWklej swój kod HTML tutaj lub użyj przycisków "Wstaw HTML" powyżej.'
									}
									className={`w-full ${
										activeTab === 'split' ? 'h-[600px]' : 'h-[700px]'
									} px-6 py-4 font-mono text-sm text-gray-900 resize-none focus:outline-none bg-gray-50/50 leading-relaxed placeholder:text-gray-500`}
									spellCheck={false}
								/>
							</div>
						)}

						{/* Preview pane */}
						{(activeTab === 'preview' || activeTab === 'split') && (
							<div
								className={`${
									activeTab === 'split' ? 'h-[600px]' : 'h-[700px]'
								} overflow-y-auto`}
							>
								{content.trim() ? (
									<div
										className='blog-content max-w-none p-6'
										dangerouslySetInnerHTML={{ __html: content }}
									/>
								) : (
									<div className='flex items-center justify-center h-full text-gray-400'>
										<div className='text-center'>
											<FileText size={48} className='mx-auto mb-3 text-gray-400' />
											<p className='text-sm'>Wpisz kod HTML, aby zobaczyć podgląd</p>
											<p className='text-xs text-gray-500 mt-1'>
												Użyj przycisków &quot;Wstaw HTML&quot; powyżej
											</p>
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Bottom save bar */}
				<div className='mx-6 flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-4 shadow-sm'>
					<p className='text-sm text-gray-500'>
						{mode === 'edit'
							? 'Zmiany zostaną zapisane natychmiast po kliknięciu "Zapisz zmiany".'
							: 'Post zostanie opublikowany natychmiast po kliknięciu "Opublikuj".'}
					</p>
					<button
						type='submit'
						disabled={saving || !title.trim() || !content.trim()}
						className='flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200'
					>
						{saving ? (
							<>
								<Loader2 size={16} className='animate-spin' /> Zapisuję...
							</>
						) : (
							<>
								<Save size={16} /> {mode === 'edit' ? 'Zapisz zmiany' : 'Opublikuj wpis'}
							</>
						)}
					</button>
				</div>
			</form>
		</div>
	)
}
