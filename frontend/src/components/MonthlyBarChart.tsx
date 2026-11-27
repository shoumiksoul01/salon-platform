import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from './ui'
import styles from './MonthlyBarChart.module.css'

export interface MonthlyBarPoint {
  label: string
  value: number
}

interface MonthlyBarChartProps {
  data: MonthlyBarPoint[]
  /** Full value for the tooltip (already formatted by the page: money, Bengali digits). */
  formatValue: (value: number) => string
  /** Short value for the vertical axis. */
  formatTick: (value: number) => string
}

const TICK_STYLE = { fill: 'var(--color-text-muted)', fontSize: 12 }

// The chart is decoration for sighted users: the page also gives the same numbers as a table.
// No animation, so it never moves for people who ask for reduced motion.
export default function MonthlyBarChart({ data, formatValue, formatTick }: MonthlyBarChartProps) {
  return (
    <div className={styles.chart} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke="var(--color-border-strong)" strokeOpacity={0.4} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={TICK_STYLE} />
          <YAxis width={56} tickLine={false} axisLine={false} tickFormatter={formatTick} tick={TICK_STYLE} />
          <Tooltip
            cursor={false}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null
              return (
                <Card>
                  <p className={styles.tipLabel}>{String(label)}</p>
                  <p className={styles.tipValue}>{formatValue(Number(payload[0].value))}</p>
                </Card>
              )
            }}
          />
          <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}