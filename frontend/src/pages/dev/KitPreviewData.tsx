import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Pagination,
  Skeleton,
  StatTile,
  Table,
  Tabs,
} from '../../components/ui'
import type { TableColumn } from '../../components/ui'

interface ShopRow {
  id: number
  name: string
  area: string
  status: 'Approved' | 'Pending' | 'Rejected'
  bookings: number
}

const SHOPS: ShopRow[] = [
  { id: 1, name: 'Rose Beauty Parlour', area: 'Gulshan', status: 'Approved', bookings: 128 },
  { id: 2, name: 'Glow Salon', area: 'Dhanmondi', status: 'Pending', bookings: 0 },
  { id: 3, name: 'Style Studio', area: 'Uttara', status: 'Rejected', bookings: 12 },
]

const STATUS_VARIANT = { Approved: 'success', Pending: 'warning', Rejected: 'danger' } as const

const COLUMNS: TableColumn<ShopRow>[] = [
  { key: 'name', header: 'Shop', render: (row) => row.name },
  { key: 'area', header: 'Area', render: (row) => row.area },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>,
  },
  { key: 'bookings', header: 'Bookings', align: 'end', render: (row) => row.bookings },
]

export default function KitPreviewData() {
  const [page, setPage] = useState(1)

  return (
    <>
      <h2>Stat tiles</h2>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
        <StatTile label="Bookings today" value={42} hint="+8 from yesterday" />
        <StatTile label="Revenue" value="৳ 18,450" />
      </section>

      <h2>Table</h2>
      <Table caption="Shops" columns={COLUMNS} rows={SHOPS} getRowKey={(row) => row.id} />

      <h2>Tabs</h2>
      <Tabs
        label="Moderation"
        tabs={[
          { id: 'reviews', label: 'Reported reviews', content: <p>Reported reviews go here.</p> },
          { id: 'disputes', label: 'Disputes', content: <p>Disputes go here.</p> },
          { id: 'audit', label: 'Audit log', content: <p>The audit log goes here.</p> },
        ]}
      />

      <h2>Pagination</h2>
      <Pagination
        page={page}
        pageCount={5}
        onPageChange={setPage}
        labels={{ nav: 'Pagination', previous: 'Previous', next: 'Next', status: `Page ${page} of 5` }}
      />

      <h2>Empty state</h2>
      <EmptyState
        icon="🔍"
        title="No shops found"
        description="Try a different area or remove a filter."
        action={<Button variant="secondary">Clear filters</Button>}
      />

      <h2>Skeleton</h2>
      <Card aria-busy="true">
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          <Skeleton circle width="3rem" height="3rem" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <Skeleton width="60%" height="1.25rem" />
            <Skeleton width="40%" />
          </div>
        </div>
      </Card>
    </>
  )
}