// next.config.ts
import type { NextConfig } from 'next'

// Bundle analyzer (opcjonalnie) - używamy dynamic import dla kompatybilności
let withBundleAnalyzer: (config: NextConfig) => NextConfig = (config) => config

if (process.env.ANALYZE === 'true') {
	try {
		const bundleAnalyzer = require('@next/bundle-analyzer')
		withBundleAnalyzer = bundleAnalyzer({
			enabled: true,
		})
	} catch (e) {
		// Bundle analyzer nie jest dostępny - kontynuuj bez niego
		console.warn('Bundle analyzer not available, continuing without it')
	}
}

const nextConfig: NextConfig = {
	// Mniejszy footprint w produkcji – standalone = jeden katalog .next/standalone, mniej zużycia RAM
	output: 'standalone',
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'images.pexels.com',
			},
			{
				protocol: 'https',
				hostname: 'placehold.co',
			},
		],
		// Optymalizacja obrazów
		formats: ['image/avif', 'image/webp'],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		minimumCacheTTL: 60 * 60 * 24 * 365, // 1 rok cache dla obrazów
	},
	experimental: {
		typedRoutes: false,
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
	// Optymalizacja kompresji
	compress: true,
	// Headers dla cache
	async headers() {
		return [
			{
				source: '/:path*',
				headers: [
					{
						key: 'X-DNS-Prefetch-Control',
						value: 'on',
					},
					{
						key: 'X-Frame-Options',
						value: 'SAMEORIGIN',
					},
				],
			},
			{
				source: '/_next/static/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=31536000, immutable', // 1 rok dla statycznych assets
					},
				],
			},
			{
				source: '/images/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=31536000, immutable', // 1 rok dla obrazów
					},
				],
			},
		]
	},
}

export default withBundleAnalyzer(nextConfig)
