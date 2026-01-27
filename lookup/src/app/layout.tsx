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
	// #region agent log
	fetch('http://127.0.0.1:7242/ingest/6e6357e8-5a43-4878-9c23-91ef269cb774',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout.tsx:14',message:'generateMetadata called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
	// #endregion

	// Podczas build time może nie być dostępu do bazy - użyj fallback
	let siteName = 'Katalogo'
	try {
		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/6e6357e8-5a43-4878-9c23-91ef269cb774',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout.tsx:18',message:'Before prisma.setting.findMany',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
		// #endregion

		const settings = await prisma.setting.findMany()
		
		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/6e6357e8-5a43-4878-9c23-91ef269cb774',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout.tsx:22',message:'After prisma.setting.findMany',data:{settingsCount:settings.length,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
		// #endregion

		const get = (key: string) => settings.find(s => s.key === key)?.value
		siteName = get('site_name') || 'Katalogo'
	} catch (error: any) {
		// #region agent log
		fetch('http://127.0.0.1:7242/ingest/6e6357e8-5a43-4878-9c23-91ef269cb774',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout.tsx:28',message:'prisma.setting.findMany error',data:{errorCode:error?.code,errorMessage:error?.message?.substring(0,100),timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
		// #endregion

		// Podczas build time baza może być niedostępna - użyj domyślnej wartości
		console.warn('[METADATA] Could not fetch settings, using default:', error)
	}

	return {
		metadataBase: new URL(BASE_URL),
		applicationName: siteName,
		title: {
			default: 'Katalogo.pl - Znajdź najlepszych fachowców',
			template: `%s | ${siteName}`, // Np. "Hydraulik | Katalogo" wygląda czyściej
		},
		description: 'Największa baza firm i fachowców w Twojej okolicy.',
		icons: {
			icon: [
				{ url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
				{ url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
			],
			shortcut: '/favicon.ico',
			apple: [
				{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
			],
		},
		manifest: '/site.webmanifest',
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

	// ⚠️ WAŻNE: NIE MODYFIKUJ tej sekcji bez powodu!
	// Google Analytics i Tag Manager są skonfigurowane i działają poprawnie.
	// Kolejność skryptów jest krytyczna: dataLayer → GTM → GA4
	// Zmiana kolejności lub struktury może spowodować, że dane przestaną być zbierane.

	return (
		<html lang='pl'>
			<head>
				{/* Mobile-First Viewport */}
				<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
				
				{/* Favicon and Icons */}
				<link rel="manifest" href="/site.webmanifest" />
				
				{/* JSON-LD Schema: To jest kluczowe dla Google Site Name */}
				<script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

				{/* 
					⚠️ KRYTYCZNE: Initialize dataLayer FIRST - before GTM and GA4
					Nie zmieniaj kolejności - dataLayer MUSI być zdefiniowany przed innymi skryptami Google
				*/}
				<script
					dangerouslySetInnerHTML={{
						__html: `window.dataLayer = window.dataLayer || [];`.trim(),
					}}
				/>

				{/* 
					⚠️ KRYTYCZNE: Google Tag Manager - Direct implementation
					Nie zmieniaj tej implementacji - działa poprawnie z Tag Assistant
					Kolejność: dataLayer → GTM → GA4
				*/}
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

				{/* 
					⚠️ KRYTYCZNE: Google Analytics 4 (gtag.js)
					Nie modyfikuj tej sekcji - jest skonfigurowana i działa poprawnie
					ID: G-ME8GSE9S3Z
					Kolejność MUSI być: dataLayer → GTM → GA4
					Nie usuwaj `function gtag()` - jest wymagane przez Google
				*/}
				{gaId && (
					<>
						<script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}></script>
						<script
							dangerouslySetInnerHTML={{
								__html: `
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${gaId}');
							`.trim(),
							}}
						/>
					</>
				)}
				{/* End Google tag (gtag.js) */}

				{/* Google AdSense */}
				<script
					async
					src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4373415012845424"
					crossOrigin="anonymous"
				/>
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
