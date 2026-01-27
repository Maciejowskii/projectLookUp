'use client'

import { useEffect, useRef } from 'react'

interface AdSenseProps {
  adSlot: string
  adFormat?: 'auto' | 'rectangle' | 'vertical' | 'horizontal'
  fullWidthResponsive?: boolean
  style?: React.CSSProperties
  className?: string
}

/**
 * Komponent Google AdSense
 * Użyj tego komponentu wszędzie, gdzie chcesz wyświetlać reklamy
 * 
 * @example
 * <AdSense adSlot="1234567890" />
 */
export function AdSense({
  adSlot,
  adFormat = 'auto',
  fullWidthResponsive = true,
  style,
  className = '',
}: AdSenseProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Funkcja sprawdzająca czy kontener ma szerokość > 0
    const checkAndInit = () => {
      if (!containerRef.current) return false

      const rect = containerRef.current.getBoundingClientRect()
      const hasWidth = rect.width > 0
      const isVisible = rect.height > 0 && window.getComputedStyle(containerRef.current).display !== 'none'

      return hasWidth && isVisible
    }

    // Opóźniona inicjalizacja - czekamy aż kontener będzie widoczny
    let retryCount = 0
    const maxRetries = 20 // Max 2 sekundy (20 * 100ms)
    
    const initAdSense = () => {
      try {
        if (typeof window === 'undefined') return

        // Sprawdź czy kontener ma szerokość
        if (!checkAndInit()) {
          retryCount++
          if (retryCount < maxRetries) {
            // Spróbuj ponownie za 100ms
            setTimeout(initAdSense, 100)
            return
          } else {
            // Po max próbach, spróbuj zainicjalizować mimo wszystko
            console.warn('[AdSense] Container width is 0, but initializing anyway')
          }
        }

        // @ts-ignore - adsbygoogle jest dodawany przez skrypt AdSense
        if (window.adsbygoogle) {
          // @ts-ignore
          ;(window.adsbygoogle = window.adsbygoogle || []).push({})
        }
      } catch (err) {
        console.error('AdSense error:', err)
      }
    }

    // Poczekaj na załadowanie DOM i CSS
    const timeoutId = setTimeout(initAdSense, 100)

    // Obserwuj zmiany rozmiaru (np. gdy sidebar się pojawia)
    let resizeObserver: ResizeObserver | null = null
    if (typeof window !== 'undefined' && containerRef.current && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => {
        if (checkAndInit() && containerRef.current) {
          const ins = containerRef.current.querySelector('.adsbygoogle')
          // Sprawdź czy reklama już nie została zainicjalizowana
          if (ins && !ins.hasAttribute('data-adsbygoogle-status')) {
            initAdSense()
          }
        }
      })
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      clearTimeout(timeoutId)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }, [adSlot])

  return (
    <div
      ref={containerRef}
      className={`adsense-container ${className}`}
      style={{ minWidth: '1px', minHeight: '1px', ...style }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minWidth: '1px', minHeight: '1px' }}
        data-ad-client="ca-pub-4373415012845424"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
      />
    </div>
  )
}

/**
 * Predefiniowane komponenty reklamowe dla różnych miejsc
 */

/**
 * INSTRUKCJA: Aby uzyskać ad slot ID:
 * 1. Zaloguj się do Google AdSense
 * 2. Przejdź do "Reklamy" > "Według jednostki reklamowej"
 * 3. Utwórz nową jednostkę reklamową (np. "Banner", "Sidebar", "In-Content")
 * 4. Skopiuj "Ad unit ID" (np. "1234567890")
 * 5. Zamień "1234567890" poniżej na prawdziwy ID
 */

// Banner na górze strony (728x90 lub responsive)
export function AdSenseBanner({ className = '' }: { className?: string }) {
  // TODO: Zamień "1234567890" na prawdziwy Ad Slot ID z Google AdSense
  const adSlot = process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT || '1234567890'
  
  if (adSlot === '1234567890') {
    // Ukryj reklamę jeśli nie jest skonfigurowana
    return null
  }

  return (
    <div className={`w-full flex justify-center my-4 ${className}`} style={{ minWidth: '320px' }}>
      <AdSense
        adSlot={adSlot}
        adFormat="auto"
        className="w-full max-w-5xl"
        style={{ minWidth: '320px', width: '100%' }}
      />
    </div>
  )
}

// Reklama w sidebarze (300x250 lub responsive)
export function AdSenseSidebar({ className = '' }: { className?: string }) {
  // TODO: Zamień "1234567890" na prawdziwy Ad Slot ID z Google AdSense
  const adSlot = process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT || '1234567890'
  
  if (adSlot === '1234567890') {
    return null
  }

  return (
    <div className={`w-full flex justify-center ${className}`} style={{ minWidth: '250px' }}>
      <AdSense
        adSlot={adSlot}
        adFormat="rectangle"
        className="w-full"
        style={{ minWidth: '250px', width: '100%' }}
      />
    </div>
  )
}

// Reklama między treścią (responsive)
export function AdSenseInContent({ className = '' }: { className?: string }) {
  // TODO: Zamień "1234567890" na prawdziwy Ad Slot ID z Google AdSense
  const adSlot = process.env.NEXT_PUBLIC_ADSENSE_INCONTENT_SLOT || '1234567890'
  
  if (adSlot === '1234567890') {
    return null
  }

  return (
    <div className={`w-full flex justify-center my-8 ${className}`} style={{ minWidth: '320px' }}>
      <AdSense
        adSlot={adSlot}
        adFormat="auto"
        className="w-full max-w-4xl"
        style={{ minWidth: '320px', width: '100%' }}
      />
    </div>
  )
}
