'use client'

import { useState } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'
import { importLeadsCSV } from '@/actions/adminActions'

export function LeadsImportForm() {
	const [file, setFile] = useState<File | null>(null)
	const [isUploading, setIsUploading] = useState(false)
	const [result, setResult] = useState<{ success: boolean; message: string; imported?: number; errors?: number } | null>(null)

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0]
		if (selectedFile) {
			if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
				setFile(selectedFile)
				setResult(null)
			} else {
				alert('Proszę wybrać plik CSV')
				setFile(null)
			}
		}
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!file) return

		setIsUploading(true)
		setResult(null)

		try {
			const formData = new FormData()
			formData.append('file', file)

			const result = await importLeadsCSV(formData)
			setResult(result)
			
			if (result.success) {
				setFile(null)
				// Reset input
				const input = document.getElementById('csv-file') as HTMLInputElement
				if (input) input.value = ''
				// Odśwież stronę po 2 sekundach
				setTimeout(() => {
					window.location.reload()
				}, 2000)
			}
		} catch (error) {
			setResult({
				success: false,
				message: 'Wystąpił błąd podczas importu pliku',
			})
		} finally {
			setIsUploading(false)
		}
	}

	return (
		<div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6'>
			<div className='flex items-center gap-3 mb-4'>
				<div className='w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center'>
					<Upload className='text-blue-600' size={20} />
				</div>
				<div>
					<h3 className='font-bold text-gray-900'>Import leadów z CSV</h3>
					<p className='text-sm text-gray-500'>Zaimportuj leady z pliku CSV</p>
				</div>
			</div>

			<form onSubmit={handleSubmit} className='space-y-4'>
				<div>
					<label className='block text-sm font-semibold text-gray-700 mb-2'>
						Wybierz plik CSV
					</label>
					<div className='flex items-center gap-3'>
						<label className='flex-1 cursor-pointer'>
							<input
								id='csv-file'
								type='file'
								accept='.csv'
								onChange={handleFileChange}
								className='hidden'
								disabled={isUploading}
							/>
							<div className='flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 transition-colors'>
								<FileSpreadsheet className='text-gray-400' size={24} />
								<div className='flex-1'>
									{file ? (
										<p className='text-sm font-medium text-gray-900'>{file.name}</p>
									) : (
										<p className='text-sm text-gray-500'>Kliknij aby wybrać plik CSV</p>
									)}
								</div>
							</div>
						</label>
					</div>
					<p className='text-xs text-gray-500 mt-2'>
						Format: Data, Imię/Nazwa, Email, Telefon, Firma (nazwa lub ID), Opis, Źródło, Status
					</p>
				</div>

				{result && (
					<div
						className={`p-4 rounded-xl flex items-start gap-3 ${
							result.success
								? 'bg-green-50 border border-green-200'
								: 'bg-red-50 border border-red-200'
						}`}
					>
						{result.success ? (
							<CheckCircle2 className='text-green-600 flex-shrink-0 mt-0.5' size={20} />
						) : (
							<AlertCircle className='text-red-600 flex-shrink-0 mt-0.5' size={20} />
						)}
						<div className='flex-1'>
							<p
								className={`text-sm font-medium ${
									result.success ? 'text-green-800' : 'text-red-800'
								}`}
							>
								{result.message}
							</p>
							{result.success && result.imported !== undefined && (
								<p className='text-xs text-green-700 mt-1'>
									Zaimportowano: {result.imported} leadów
									{result.errors !== undefined && result.errors > 0 && (
										<span className='ml-2'>Błędy: {result.errors}</span>
									)}
								</p>
							)}
						</div>
					</div>
				)}

				<button
					type='submit'
					disabled={!file || isUploading}
					className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2'
				>
					{isUploading ? (
						<>
							<div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
							Importowanie...
						</>
					) : (
						<>
							<Upload size={18} />
							Importuj leady
						</>
					)}
				</button>
			</form>
		</div>
	)
}
