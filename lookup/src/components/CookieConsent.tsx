'use client'

import { useState, useEffect } from 'react'
import { X, Settings, Check, X as XIcon } from 'lucide-react'

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    dataLayer?: any[]
  }
}

type ConsentStatus = 'accepted' | 'rejected' | 'pending' | 'customized'

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>('pending')
  const [preferences, setPreferences] = useState({
    analytics: true,
  })

  useEffect(() => {
    // Sprawdź czy użytkownik już wyraził zgodę
    const savedConsent = localStorage.getItem('cookie_consent')
    if (!savedConsent) {
      // Sprawdź czy użytkownik jest z EOG (na podstawie geolokalizacji lub domyślnie pokazuj)
      setShowBanner(true)
    } else {
      const consent = JSON.parse(savedConsent)
      setConsentStatus(consent.status)
      setPreferences(consent.preferences || { analytics: true })
      updateConsent(consent.status, consent.preferences || { analytics: true })
    }
  }, [])

  const updateConsent = (status: ConsentStatus, prefs?: { analytics: boolean }) => {
    const analytics = prefs?.analytics ?? (status === 'accepted')

    // Google Consent Mode v2
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: analytics ? 'granted' : 'denied',
        ad_storage: 'denied', // Nie używamy reklam
        ad_user_data: 'denied', // Nie używamy reklam
        ad_personalization: 'denied', // Nie używamy reklam
      })
    }

    // Zapisz do localStorage
    localStorage.setItem(
      'cookie_consent',
      JSON.stringify({
        status,
        preferences: prefs || { analytics },
        timestamp: new Date().toISOString(),
      })
    )
  }

  const handleAccept = () => {
    setConsentStatus('accepted')
    setShowBanner(false)
    updateConsent('accepted', { analytics: true })
  }

  const handleReject = () => {
    setConsentStatus('rejected')
    setShowBanner(false)
    updateConsent('rejected', { analytics: false })
  }

  const handleSaveSettings = () => {
    setConsentStatus('customized')
    setShowSettings(false)
    setShowBanner(false)
    updateConsent('customized', preferences)
  }

  if (!showBanner && !showSettings) return null

  return (
    <>
      {/* Banner zgody */}
      {showBanner && !showSettings && (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t-2 border-gray-200 shadow-2xl p-4 md:p-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-2 text-lg">Zarządzanie zgodą na pliki cookie</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Używamy plików cookie i podobnych technologii, aby zapewnić najlepsze doświadczenie na naszej stronie.
                Możesz zarządzać swoimi preferencjami dotyczącymi plików cookie w dowolnym momencie.
                <a
                  href="/cookies"
                  className="text-blue-600 hover:text-blue-800 underline ml-1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Dowiedz się więcej
                </a>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={handleReject}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <XIcon size={18} />
                Nie zgadzam się
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-900 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Settings size={18} />
                Zarządzaj opcjami
              </button>
              <button
                onClick={handleAccept}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-lg"
              >
                <Check size={18} />
                Zgadzam się
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel ustawień */}
      {showSettings && (
        <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Ustawienia plików cookie</h2>
                <button
                  onClick={() => {
                    setShowSettings(false)
                    if (consentStatus === 'pending') {
                      setShowBanner(true)
                    }
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} className="text-gray-500" />
                </button>
              </div>

              <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                Możesz wybrać, które pliki cookie chcesz akceptować. Niezbędne pliki cookie są zawsze aktywne,
                ponieważ są wymagane do podstawowego funkcjonowania strony.
              </p>

              <div className="space-y-4 mb-6">
                {/* Analytics */}
                <div className="border-2 border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">Pliki cookie analityczne</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Pomagają nam zrozumieć, jak użytkownicy korzystają z naszej strony (Google Analytics)
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        onChange={(e) =>
                          setPreferences({ ...preferences, analytics: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setPreferences({ analytics: false })
                    handleReject()
                  }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-xl transition-colors"
                >
                  Odrzuć wszystkie
                </button>
                <button
                  onClick={() => {
                    setPreferences({ analytics: true })
                    handleAccept()
                  }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-xl transition-colors"
                >
                  Akceptuj wszystkie
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-lg flex-1"
                >
                  Zapisz preferencje
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
