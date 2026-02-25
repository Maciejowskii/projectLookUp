const ADMIN_TERMINATION_CODE = '57P01'

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message
	return String(error)
}

export function isPostgresAdminTermination(error: unknown): boolean {
	const msg = getErrorMessage(error)
	return msg.includes(ADMIN_TERMINATION_CODE) || msg.includes('terminating connection due to administrator command')
}

export async function withPrismaRetry<T>(
	operation: () => Promise<T>,
	options?: { maxAttempts?: number; initialDelayMs?: number },
): Promise<T> {
	const maxAttempts = options?.maxAttempts ?? 3
	const initialDelayMs = options?.initialDelayMs ?? 400
	let lastError: unknown

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await operation()
		} catch (error) {
			lastError = error
			if (!isPostgresAdminTermination(error) || attempt === maxAttempts) {
				throw error
			}

			const delayMs = initialDelayMs * attempt
			await new Promise(resolve => setTimeout(resolve, delayMs))
		}
	}

	throw lastError
}
