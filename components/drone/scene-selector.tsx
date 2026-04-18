'use client'

import { Map, Building2, Warehouse, AlertTriangle } from 'lucide-react'
import { useDrone } from '@/lib/drone-context'
import { GlassPanel } from './glass-panel'
import { SCENE_CONFIGS, type SceneType } from '@/lib/drone-types'
import { cn } from '@/lib/utils'

const sceneIcons: Record<SceneType, React.ReactNode> = {
  urban: <Building2 className="w-5 h-5" />,
  warehouse: <Warehouse className="w-5 h-5" />,
  emergency: <AlertTriangle className="w-5 h-5" />
}

export function SceneSelector() {
  const { currentScene, setCurrentScene, triggerButton } = useDrone()

  const handleSceneChange = (scene: SceneType) => {
    setCurrentScene(scene)
    triggerButton('sceneSwitch')
  }

  return (
    <GlassPanel 
      title="Scene Selector" 
      icon={<Map className="w-4 h-4" />}
    >
      <div className="space-y-2">
        {Object.values(SCENE_CONFIGS).map((scene) => (
          <button
            key={scene.id}
            onClick={() => handleSceneChange(scene.id)}
            className={cn(
              'w-full p-3 rounded-lg border text-left transition-all duration-200',
              currentScene === scene.id
                ? 'bg-primary/20 border-primary/50 shadow-lg shadow-primary/10'
                : 'bg-secondary/30 border-border/50 hover:bg-secondary/50 hover:border-border'
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn(
                'transition-colors',
                currentScene === scene.id ? 'text-primary' : 'text-muted-foreground'
              )}>
                {sceneIcons[scene.id]}
              </span>
              <div>
                <div className={cn(
                  'text-sm font-medium transition-colors',
                  currentScene === scene.id ? 'text-foreground' : 'text-foreground/80'
                )}>
                  {scene.name}
                </div>
                <div className="text-xs text-muted-foreground">{scene.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </GlassPanel>
  )
}
