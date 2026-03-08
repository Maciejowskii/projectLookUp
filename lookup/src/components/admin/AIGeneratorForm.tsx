'use client'

import { useFormStatus } from 'react-dom'
import { Sparkles, Loader2 } from 'lucide-react'

function SubmitButton() {
	const { pending } = useFormStatus()

	return (
		<button
			type='submit'
			disabled={pending}
			className='w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all flex justify-center items-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed'
		>
			{pending ? (
				<>
					<Loader2 size={18} className='animate-spin' />
					Generuję artykuł...
				</>
			) : (
				<>
					<Sparkles size={18} />
					Wygeneruj i Opublikuj
				</>
			)}
		</button>
	)
}

interface AIGeneratorFormProps {
	action: (formData: FormData) => Promise<void>
}

export function AIGeneratorForm({ action }: AIGeneratorFormProps) {
	return (
		<form action={action} className='space-y-4'>
			<div>
				<label className='block text-xs font-bold text-indigo-700 uppercase mb-1'>Temat artykułu</label>
				<input
					name='topic'
					required
					placeholder='np. Jak wybrać dobrego hydraulika?'
					className='w-full p-3 rounded-xl border border-indigo-200 text-gray-900 focus:ring-2 focus:ring-purple-400 outline-none placeholder:text-gray-500'
				/>
			</div>
			<SubmitButton />
			<p className='text-xs text-indigo-600 text-center'>
				To zajmie ok. 5-10 sekund. Artykuł pojawi się na liście poniżej.
			</p>
		</form>
	)
}
