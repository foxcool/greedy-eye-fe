'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useRules } from '@/hooks/use-rules'
import { usePortfolios } from '@/hooks/use-portfolios'
import { TARGET_ALLOCATION_RULE_TYPE } from '@/lib/api/automation-api'
import { PortfolioActions } from './portfolio-actions'

const STATUS_LABELS: Record<string, string> = {
  RULE_STATUS_ACTIVE: 'Active',
  RULE_STATUS_PAUSED: 'Paused',
  RULE_STATUS_DISABLED: 'Disabled',
  RULE_STATUS_ERROR: 'Error',
  RULE_STATUS_UNKNOWN: 'Unknown',
}

export function RulesView() {
  const { data: rules = [], isLoading, error } = useRules()
  const { data: portfolios = [] } = usePortfolios()
  const portfolioName = (id: string) => portfolios.find((p) => p.id === id)?.name ?? id

  const targetRules = rules.filter((r) => r.ruleType === TARGET_ALLOCATION_RULE_TYPE)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Rules</h1>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="pt-4">
          {isLoading ? (
            <p className="text-muted-foreground">Loading rules…</p>
          ) : error ? (
            <p className="text-destructive">Failed to load rules.</p>
          ) : rules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <p className="text-muted-foreground">
                No rules yet. Set target allocations from a portfolio&apos;s Settings tab.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Portfolio</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.ruleType}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {portfolioName(r.portfolioId)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {STATUS_LABELS[r.status ?? 'RULE_STATUS_UNKNOWN'] ?? r.status}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="actions" className="pt-4 space-y-6">
          <p className="text-sm text-muted-foreground">
            Buy/sell to bring each portfolio back to its target allocation. Execute manually.
          </p>
          {targetRules.length === 0 ? (
            <p className="text-muted-foreground">No target allocations set.</p>
          ) : (
            targetRules.map((r) => (
              <PortfolioActions
                key={r.id}
                portfolioId={r.portfolioId}
                name={portfolioName(r.portfolioId)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
