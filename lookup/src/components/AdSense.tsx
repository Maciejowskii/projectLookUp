'use client'

import { useEffect } from 'react'

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
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        // @ts-ignore - adsbygoogle jest dodawany przez skrypt AdSense
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      }
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [])

  return (
    <div className={`adsense-container ${className}`} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
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
    <div className={`w-full flex justify-center my-4 ${className}`}>
      <AdSense
        adSlot={adSlot}
        adFormat="auto"
        className="w-full max-w-5xl"
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
    <div className={`w-full flex justify-center ${className}`}>
      <AdSense
        adSlot={adSlot}
        adFormat="rectangle"
        className="w-full"
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
    <div className={`w-full flex justify-center my-8 ${className}`}>
      <AdSense
        adSlot={adSlot}
        adFormat="auto"
        className="w-full max-w-4xl"
      />
    </div>
  )
}
