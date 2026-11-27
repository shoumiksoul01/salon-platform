import { useTranslation } from 'react-i18next'
import MonthlyBarChart from '../../components/MonthlyBarChart'
import { Button, Card, EmptyState, Skeleton, StatTile, Table } from '../../components/ui'
import type { TableColumn } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { getAdminDashboard } from '../../api/adminDashboard'
import type { AdminDashboard, MonthlyStat } from '../../api/adminDashboard'
import styles from './AdminDashboardPage.module.css'

// ADM-01: platform dashboard and analytics (FR-10.4).
// UI-SK-27: the four numbers and the pending shops. UI-SK-28: the monthly charts.

function useFormats() {
  const { i18n } = useTranslation()
  const locale = i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB'
  const numberFormat = new Intl.NumberFormat(locale)
  const moneyFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  const compactFormat = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })
  const monthFormat = new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit', timeZone: 'UTC' })
  return {
    number: (value: number) => numberFormat.format(value),
    money: (poisha: number) => `৳${moneyFormat.format(poisha / 100)}`,
    moneyShort: (poisha: number) => `৳${compactFormat.format(poisha / 100)}`,
    month: (month: string) => monthFormat.format(new Date(`${month}-01T00:00:00Z`)),
  }
}

function Loading({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={styles.loading}>
      <div className={styles.tiles}>
        {[1, 2, 3, 4].map((n) => (
          <Card key={n}>
            <Skeleton width="60%" />
            <Skeleton width="40%" height="1.5rem" />
          </Card>
        ))}
      </div>
      <Skeleton width="100%" height="4rem" />
      <Skeleton width="100%" height="16rem" />
    </div>
  )
}

function Content({ data }: { data: AdminDashboard }) {
  const { t } = useTranslation('adminDashboard')
  const format = useFormats()

  const columns: TableColumn<MonthlyStat>[] = [
    { key: 'month', header: t('charts.month'), render: (row) => format.month(row.month) },
    { key: 'bookings', header: t('charts.bookings'), render: (row) => format.number(row.bookings), align: 'end' },
    { key: 'revenue', header: t('charts.revenue'), render: (row) => format.money(row.revenue_poisha), align: 'end' },
  ]

  const bookingsPoints = data.monthly.map((row) => ({ label: format.month(row.month), value: row.bookings }))
  const revenuePoints = data.monthly.map((row) => ({ label: format.month(row.month), value: row.revenue_poisha }))

  return (
    <>
      <p className={styles.muted}>{t('subtitle')}</p>

      <div className={styles.tiles}>
        <StatTile label={t('tiles.shops')} value={format.number(data.total_shops)} hint={t('tiles.shopsHint')} />
        <StatTile label={t('tiles.users')} value={format.number(data.total_users)} hint={t('tiles.usersHint')} />
        <StatTile
          label={t('tiles.bookings')}
          value={format.number(data.total_bookings)}
          hint={t('tiles.bookingsHint')}
        />
        <StatTile
          label={t('tiles.revenue')}
          value={format.money(data.total_revenue_poisha)}
          hint={t('tiles.revenueHint')}
        />
      </div>

      <section aria-labelledby="pending-title" className={styles.section}>
        <h2 id="pending-title" className={styles.sectionTitle}>
          {t('pending.title')}
        </h2>
        <Card>
          {data.pending_shops > 0 ? (
            <>
              <p className={styles.pendingCount}>
                {t('pending.count', { count: data.pending_shops, formatted: format.number(data.pending_shops) })}
              </p>
              <p className={styles.muted}>{t('pending.hint')}</p>
            </>
          ) : (
            <p className={styles.pendingCount}>{t('pending.none')}</p>
          )}
        </Card>
      </section>

      <section aria-labelledby="charts-title" className={styles.section}>
        <h2 id="charts-title" className={styles.sectionTitle}>
          {t('charts.title')}
        </h2>
        {data.monthly.length === 0 ? (
          <EmptyState title={t('charts.emptyTitle')} description={t('charts.emptyText')} />
        ) : (
          <>
            <div className={styles.charts}>
              <Card>
                <h3 className={styles.chartTitle}>{t('charts.bookingsTitle')}</h3>
                <MonthlyBarChart data={bookingsPoints} formatValue={format.number} formatTick={format.number} />
              </Card>
              <Card>
                <h3 className={styles.chartTitle}>{t('charts.revenueTitle')}</h3>
                <MonthlyBarChart data={revenuePoints} formatValue={format.money} formatTick={format.moneyShort} />
              </Card>
            </div>
            <details className={styles.details}>
              <summary className={styles.summary}>{t('charts.showTable')}</summary>
              <Table
                columns={columns}
                rows={data.monthly}
                getRowKey={(row) => row.month}
                caption={t('charts.tableCaption')}
              />
            </details>
          </>
        )}
      </section>
    </>
  )
}

export default function AdminDashboardPage() {
  const { t } = useTranslation(['adminDashboard', 'common'])
  const { state, retry } = useAsync(getAdminDashboard)

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('title')}</h1>

      {state.status === 'loading' && <Loading label={t('loading')} />}

      {state.status === 'error' && (
        <>
          <p className={styles.muted} role="alert">
            {t('common:states.error')}
          </p>
          <div>
            <Button variant="secondary" onClick={retry}>
              {t('common:actions.retry')}
            </Button>
          </div>
        </>
      )}

      {state.status === 'ready' && <Content data={state.data} />}
    </div>
  )
}