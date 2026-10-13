import Card from './Card'
import styles from './StatTile.module.css'

export interface StatTileProps {
  label: string
  /** Already formatted by the page (numbers, currency, Bengali digits). */
  value: string | number
  hint?: string
}

export default function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <Card>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      {hint && <p className={styles.hint}>{hint}</p>}
    </Card>
  )
}