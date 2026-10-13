import type { ReactNode } from 'react'
import styles from './Table.module.css'

export interface TableColumn<Row> {
  key: string
  header: string
  render: (row: Row) => ReactNode
  align?: 'start' | 'end'
}

export interface TableProps<Row> {
  columns: TableColumn<Row>[]
  rows: Row[]
  getRowKey: (row: Row) => string | number
  /** Names the table for screen readers. It is not shown. */
  caption: string
}

export default function Table<Row>({ columns, rows, getRowKey, caption }: TableProps<Row>) {
  return (
    <div className={styles.scroll} role="region" aria-label={caption} tabIndex={0}>
      <table className={styles.table}>
        <caption className={styles.caption}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={column.align === 'end' ? styles.end : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} className={column.align === 'end' ? styles.end : undefined}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}