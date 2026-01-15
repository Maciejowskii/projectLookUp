export const dynamic = 'force-dynamic'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { prisma } from '@/lib/prisma'
import { Toaster } from 'react-hot-toast'
// GoogleTagManager removed - using direct script implementation for better compatibility
import { Providers } from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

const BASE_URL = process.env.NEXT_PUBLIC_URL || 'https://katalogo.pl' // Zmień na HTTPS w produkcji

export async function generateMetadata(): Promise<Metadata> {
	const settings = await prisma.setting.findMany()
	const get = (key: string) => settings.find(s => s.key === key)?.value

	const siteName = get('site_name') || 'Katalogo'

	return {
		metadataBase: new URL(BASE_URL),
		applicationName: siteName,
		title: {
			default: 'Katalogo.pl - Znajdź najlepszych fachowców',
			template: `%s | ${siteName}`, // Np. "Hydraulik | Katalogo" wygląda czyściej
		},
		description: 'Największa baza firm i fachowców w Twojej okolicy.',
		openGraph: {
			images: ['/og-image.png'],
			siteName: siteName, // <-- WAŻNE dla social media
			type: 'website',
			locale: 'pl_PL',
		},
		// Dodatkowe dla pewności
		appleWebApp: {
			title: siteName,
		},
	}
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	// Dane strukturalne, które wymuszają nazwę w wynikach Google
	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: 'Katalogo', // <-- To nazwa, którą chcesz widzieć w Google (dużymi literami)
		alternateName: ['Katalogo.pl'],
		url: BASE_URL,
	}

	const gtmId = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-KBMJTNBQ'
	const gaId = process.env.NEXT_PUBLIC_GA_ID || 'G-ME8GSE9S3Z'

	return (
		<html lang='pl'>
			<head>
				{/* JSON-LD Schema: To jest kluczowe dla Google Site Name */}
				<script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

				{/* Google Tag Manager - Direct implementation for better compatibility */}
				{gtmId && (
					<script
						dangerouslySetInnerHTML={{
							__html: `
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');
							`.trim(),
						}}
					/>
				)}
				{/* End Google Tag Manager */}

				{/* Google tag (gtag.js) - Google Analytics 4 */}
				{gaId && (
					<>
						<script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}></script>
						<script
							dangerouslySetInnerHTML={{
								__html: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${gaId}');
							`.trim(),
							}}
						/>
					</>
				)}
				{/* End Google tag (gtag.js) */}
			</head>
			<body className={inter.className}>
				{/* Google Tag Manager (noscript) - must be immediately after opening <body> tag */}
				{gtmId && (
					<noscript>
						<iframe
							src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
							height='0'
							width='0'
							style={{ display: 'none', visibility: 'hidden' }}
						/>
					</noscript>
				)}
				{/* End Google Tag Manager (noscript) */}

				<Providers>
					{children}
					<Toaster />
				</Providers>
			</body>
		</html>
	)
}
