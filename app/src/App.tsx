// app/src/App.tsx — Root component
// §19.7 — Scan screen is eager. All other screens are lazy-loaded.

import { createSignal, lazy, Suspense } from 'solid-js'
import ScanScreen from './screens/Scan'
import type { QRPayload } from '../../shared/types'

// Lazy-loaded screens — only downloaded when the user navigates there
const NavigateScreen = lazy(() => import('./screens/Navigate'))
const SearchScreen = lazy(() => import('./screens/Search'))
const FloorMapScreen = lazy(() => import('./screens/FloorMap'))
const SettingsScreen = lazy(() => import('./screens/Settings'))

type Screen = 'scan' | 'navigate' | 'search' | 'map' | 'settings'

export default function App() {
  const [screen, setScreen] = createSignal<Screen>('scan')
  const [lastPayload, setLastPayload] = createSignal<QRPayload | null>(null)

  function onScanned(payload: QRPayload) {
    setLastPayload(payload)
    setScreen('navigate')
  }

  return (
    <div class="app">
      {/* Scan screen — always present in bundle, no Suspense needed */}
      {screen() === 'scan' && (
        <ScanScreen onScanned={onScanned} />
      )}

      {/* All other screens — lazy loaded */}
      <Suspense fallback={<div class="screen-loading" aria-label="Loading…" />}>
        {screen() === 'navigate' && lastPayload() && (
          <NavigateScreen payload={lastPayload()!} onBack={() => setScreen('scan')} />
        )}
        {screen() === 'search' && (
          <SearchScreen onNavigate={(id: string) => { console.log('nav to', id); setScreen('navigate') }} />
        )}
        {screen() === 'map' && (
          <FloorMapScreen />
        )}
        {screen() === 'settings' && (
          <SettingsScreen />
        )}
      </Suspense>

      {/* Bottom nav */}
      <nav class="bottom-nav" aria-label="Main navigation">
        <button id="nav-scan" class={screen() === 'scan' ? 'active' : ''} onClick={() => setScreen('scan')} aria-label="Scan QR">📷</button>
        <button id="nav-search" class={screen() === 'search' ? 'active' : ''} onClick={() => setScreen('search')} aria-label="Search">🔍</button>
        <button id="nav-map" class={screen() === 'map' ? 'active' : ''} onClick={() => setScreen('map')} aria-label="Floor map">🗺️</button>
        <button id="nav-settings" class={screen() === 'settings' ? 'active' : ''} onClick={() => setScreen('settings')} aria-label="Settings">⚙️</button>
      </nav>
    </div>
  )
}
