import Button from './Button'
import styles from './Pagination.module.css'

export interface PaginationLabels {
  /** Names the navigation for screen readers. */
  nav: string
  previous: string
  next: string
  /** Already formatted by the page, for example "Page 2 of 5". */
  status: string
}

export interface PaginationProps {
  /** Current page, starting at 1. */
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  labels: PaginationLabels
}

export default function Pagination({ page, pageCount, onPageChange, labels }: PaginationProps) {
  if (pageCount <= 1) return null

  return (
    <nav aria-label={labels.nav} className={styles.pagination}>
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        {labels.previous}
      </Button>
      <span className={styles.status} aria-live="polite">
        {labels.status}
      </span>
      <Button variant="secondary" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
        {labels.next}
      </Button>
    </nav>
  )
}