'use client'

import type { Portfolio } from '@/lib/api/backend-types'
import type { ParamField, WidgetParams } from '@/lib/config/dashboard-widgets'

interface WidgetParamsFormProps {
  fields: ParamField[]
  params: WidgetParams
  portfolios: Portfolio[]
  onChange: (params: WidgetParams) => void
}

/**
 * The edit form is generated from the field list a widget declares, so adding a
 * parameter is a line in the registry rather than a form component.
 *
 * Fields are declared, not inferred from a validation schema: deriving controls
 * from an arbitrary schema means guessing which string is a free text box and
 * which is a picker, and guessing wrong is a control the user cannot use.
 */
export function WidgetParamsForm({ fields, params, portfolios, onChange }: WidgetParamsFormProps) {
  if (fields.length === 0) {
    return <p className="text-xs text-muted-foreground">This widget has no settings.</p>
  }

  const set = (key: string, value: string) => onChange({ ...params, [key]: value })

  return (
    <div className="flex flex-wrap gap-4">
      {fields.map(field => {
        const options =
          field.kind === 'portfolio'
            ? [{ value: '', label: field.allLabel }, ...portfolios.map(p => ({ value: p.id, label: p.name }))]
            : field.options

        return (
          <label key={field.key} className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">{field.label}</span>
            <select
              value={params[field.key] ?? ''}
              onChange={e => set(field.key, e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            >
              {options.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )
      })}
    </div>
  )
}
