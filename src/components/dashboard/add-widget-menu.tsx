'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { availableWidgets, type WidgetId } from '@/lib/config/dashboard-widgets'
import { DEMO_MODE } from '@/lib/config/data-source'

/**
 * The add menu lists what this mode can actually render. Widgets with no data
 * source behind them are absent outside the demo rather than shown greyed out:
 * an option that adds an empty card is a worse answer than not offering it.
 */
export function AddWidgetMenu({ onAdd }: { onAdd: (type: WidgetId) => void }) {
  const options = availableWidgets(DEMO_MODE)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus size={14} className="mr-1" />
          Add widget
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {options.map(def => (
          <DropdownMenuItem
            key={def.type}
            onSelect={() => onAdd(def.type)}
            className="flex flex-col items-start gap-0.5"
          >
            <span className="text-sm">{def.title}</span>
            <span className="text-xs text-muted-foreground">{def.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
