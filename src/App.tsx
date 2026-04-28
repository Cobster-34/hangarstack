import { useState, useCallback } from 'react'
import { AppProvider } from './lib/AppContext'
import { useHangarData } from './hooks/useHangarData'
import { HangarCanvas } from './components/canvas/HangarCanvas'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { ViolationsPanel } from './components/canvas/ViolationsPanel'
import { AddAircraftModal } from './components/aircraft/AddAircraftModal'
import { useAppState } from './lib/AppContext'

function AppInner() {
  const { state } = useAppState()
  const {
    movePlacement,
    addAircraftToHangar,
    updateAircraftStatus,
    updateDispatchOrder,
    reload,
  } = useHangarData()

  const [showAddAircraft, setShowAddAircraft] = useState(false)

  const handleExportPDF = useCallback(() => {
    window.print()
  }, [])

  if (state.isLoading) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-base)', color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontSize: 24, opacity: 0.3 }}>✈</div>
        <div>Loading hangar data…</div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Header onExportPDF={handleExportPDF} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar
          onAddToHangar={(id) => {
            if (state.activeHangarId) addAircraftToHangar(id, state.activeHangarId)
          }}
          onUpdateStatus={updateAircraftStatus}
          onUpdateDispatchOrder={updateDispatchOrder}
          onOpenAddAircraft={() => setShowAddAircraft(true)}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <HangarCanvas onMovePlacement={movePlacement} />
          <ViolationsPanel />
        </div>
      </div>

      {showAddAircraft && (
        <AddAircraftModal
          onClose={() => setShowAddAircraft(false)}
          onAdded={reload}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
