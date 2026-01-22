import { prisma } from '@/lib/prisma'

export async function getNotificationEmails(): Promise<string[]> {
	const setting = await prisma.setting.findUnique({
		where: { key: 'notification_emails' },
	})

	if (setting?.value) {
		const emails = setting.value
			.split('\n')
			.map((e) => e.trim())
			.filter((e) => e.length > 0 && e.includes('@'))
		if (emails.length > 0) return emails
	}

	if (process.env.ADMIN_EMAIL) {
		return process.env.ADMIN_EMAIL
			.split(',')
			.map((e) => e.trim())
			.filter((e) => e.length > 0)
	}

	return []
}
