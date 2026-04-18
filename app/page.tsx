import { DroneProvider } from '@/lib/drone-context'
import { GameProvider } from '@/lib/game-state'
import { Dashboard } from '@/components/drone/dashboard'

export default function Home() {
  return (
    <DroneProvider>
      <GameProvider>
        <Dashboard />
      </GameProvider>
    </DroneProvider>
  )
}
