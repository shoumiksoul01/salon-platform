import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  Pagination,
  Skeleton,
  StatTile,
  Table,
  useToast,
} from '../../components/ui'
import type { TableColumn } from '../../components/ui'
import { useBookingFormat } from '../../hooks/useBookingFormat'
import { MAX_RANGE_DAYS, ReportError, generateReport, getReportFile } from '../../api/reports'
import type { BookingReport, ReportDay, ReportErrorCode, ReportService } from '../../api/reports'
import styles from './ReportsPage.module.css'

// OWN-09: owner reports (FR-09.2). The owner picks a period, creates the booking and earnings
// report and downloads it as a CSV file. Dates are Dhaka calendar days.
// Earnings follow the dashboard rule: total price of finished bookings, after offers.

type Result =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; report: BookingReport }

interface FieldErrors {
  from?: string
  to?: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000
const DAYS_PER_PAGE = 10

// Which message to show when the server refuses the dates.
const REFUSED: Record<ReportErrorCode, 'order' | 'tooLong' | 'future'> = {
  invalid_range: 'order',
  too_long: 'tooLong',
  future: 'future',
}

// A Dhaka calendar day as 'YYYY-MM-DD'.
const dhakaDay = (ms: number) => new Date(ms + DHAKA_OFFSET_MS).toISOString().slice(0, 10)

const daysIn = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1

function useNumber() {
  const { i18n } = useTranslation()
  const format = new Intl.NumberFormat(i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB')
  return (value: number) => format.format(value)
}

function Loading({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={styles.loading}>
      <div className={styles.tiles}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Card key={n}>
            <Skeleton width="50%" />
            <Skeleton width="30%" height="1.5rem" />
          </Card>
        ))}
      </div>
      <Card>
        <Skeleton width="40%" />
        <Skeleton width="90%" />
        <Skeleton width="80%" />
      </Card>
    </div>
  )
}

function ReportView({ report }: { report: BookingReport }) {
  const { t } = useTranslation('ownerReports')
  const toast = useToast()
  const format = useBookingFormat()
  const formatNumber = useNumber()
  const [page, setPage] = useState(1)
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const file = await getReportFile(report)
      const url = URL.createObjectURL(file.blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.show({ message: t('toast.downloaded'), variant: 'success' })
    } catch {
      toast.show({ message: t('toast.downloadFailed'), variant: 'danger' })
    } finally {
      setDownloading(false)
    }
  }

  const dayColumns: TableColumn<ReportDay>[] = [
    { key: 'day', header: t('columns.date'), render: (row) => format.day(row.day) },
    { key: 'bookings', header: t('columns.bookings'), render: (row) => formatNumber(row.bookings), align: 'end' },
    { key: 'completed', header: t('columns.completed'), render: (row) => formatNumber(row.completed), align: 'end' },
    { key: 'cancelled', header: t('columns.cancelled'), render: (row) => formatNumber(row.cancelled), align: 'end' },
    { key: 'no_show', header: t('columns.noShow'), render: (row) => formatNumber(row.no_show), align: 'end' },
    { key: 'earnings', header: t('columns.earnings'), render: (row) => format.money(row.earnings_poisha), align: 'end' },
  ]

  const serviceColumns: TableColumn<ReportService>[] = [
    { key: 'name', header: t('columns.service'), render: (row) => row.service_name },
    { key: 'count', header: t('columns.bookings'), render: (row) => formatNumber(row.count), align: 'end' },
    { key: 'amount', header: t('columns.amount'), render: (row) => format.money(row.amount_poisha), align: 'end' },
  ]

  const pageCount = Math.max(1, Math.ceil(report.days.length / DAYS_PER_PAGE))
  const current = Math.min(page, pageCount)
  const shownDays = report.days.slice((current - 1) * DAYS_PER_PAGE, current * DAYS_PER_PAGE)

  return (
    <section className={styles.result} aria-labelledby="report-title">
      <div className={styles.resultHead}>
        <div>
          <h2 id="report-title" className={styles.resultTitle}>
            {t('result.title', { from: format.day(report.from), to: format.day(report.to) })}
          </h2>
          <p className={styles.muted}>{t('result.shop', { shop: report.shop_name })}</p>
        </div>
        {report.total_count > 0 && (
          <Button variant="secondary" onClick={handleDownload} loading={downloading}>
            {t('result.download')}
          </Button>
        )}
      </div>

      {report.total_count === 0 ? (
        <EmptyState title={t('result.emptyTitle')} description={t('result.emptyText')} />
      ) : (
        <>
          <div className={styles.tiles}>
            <StatTile label={t('tiles.total')} value={formatNumber(report.total_count)} />
            <StatTile label={t('tiles.completed')} value={formatNumber(report.completed_count)} />
            <StatTile label={t('tiles.cancelled')} value={formatNumber(report.cancelled_count)} />
            <StatTile label={t('tiles.noShow')} value={formatNumber(report.no_show_count)} />
            <StatTile
              label={t('tiles.earnings')}
              value={format.money(report.earnings_poisha)}
              hint={t('tiles.earningsHint')}
            />
          </div>

          <p className={styles.note}>
            {t('result.rule')}
            {report.discount_poisha > 0 && ` ${t('result.discounts', { amount: format.money(report.discount_poisha) })}`}
            {report.open_count > 0 && ` ${t('result.open', { number: formatNumber(report.open_count) })}`}
          </p>

          <h3 className={styles.sectionTitle}>{t('byDay.title')}</h3>
          <Table
            caption={t('byDay.title')}
            columns={dayColumns}
            rows={shownDays}
            getRowKey={(row) => row.day}
          />
          <Pagination
            page={current}
            pageCount={pageCount}
            onPageChange={setPage}
            labels={{
              nav: t('pagination.nav'),
              previous: t('pagination.previous'),
              next: t('pagination.next'),
              status: t('pagination.status', { page: formatNumber(current), total: formatNumber(pageCount) }),
            }}
          />

          <h3 className={styles.sectionTitle}>{t('byService.title')}</h3>
          <p className={styles.muted}>{t('byService.hint')}</p>
          {report.services.length === 0 ? (
            <EmptyState title={t('byService.emptyTitle')} description={t('byService.emptyText')} />
          ) : (
            <Table
              caption={t('byService.title')}
              columns={serviceColumns}
              rows={report.services}
              getRowKey={(row) => row.service_name}
            />
          )}
        </>
      )}
    </section>
  )
}

// The layout provides the one <main>, so this page renders a <div>.
export default function ReportsPage() {
  const { t } = useTranslation('ownerReports')
  const formatNumber = useNumber()
  const [today] = useState(() => dhakaDay(Date.now()))
  const [from, setFrom] = useState(() => dhakaDay(Date.now() - 29 * DAY_MS))
  const [to, setTo] = useState(() => dhakaDay(Date.now()))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [result, setResult] = useState<Result>({ status: 'idle' })

  function applyPreset(start: string) {
    setFrom(start)
    setTo(today)
    setErrors({})
  }

  function validate(): FieldErrors {
    const found: FieldErrors = {}
    if (!from) found.from = t('errors.fromRequired')
    if (!to) found.to = t('errors.toRequired')
    if (from && to) {
      if (from > to) found.to = t('errors.order')
      else if (to > today) found.to = t('errors.future')
      else if (daysIn(from, to) > MAX_RANGE_DAYS) found.to = t('errors.tooLong', { max: formatNumber(MAX_RANGE_DAYS) })
    }
    return found
  }

  // Checks the dates, then asks for the report. Used by the form and by the retry button.
  async function run() {
    const found = validate()
    setErrors(found)
    if (found.from || found.to) return
    setResult({ status: 'loading' })
    try {
      const report = await generateReport(from, to)
      setResult({ status: 'ready', report })
    } catch (caught) {
      if (caught instanceof ReportError) {
        // The server refused the dates: show the reason next to the field.
        setErrors({ to: t(`errors.${REFUSED[caught.code]}`, { max: formatNumber(MAX_RANGE_DAYS) }) })
        setResult({ status: 'idle' })
      } else {
        setResult({ status: 'error' })
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void run()
  }

  const busy = result.status === 'loading'
  const monthStart = `${today.slice(0, 8)}01`

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.muted}>{t('intro')}</p>

      <Card>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.dates}>
            <FormField label={t('form.from')} error={errors.from} required>
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  value={from}
                  max={today}
                  onChange={(event) => {
                    setFrom(event.target.value)
                    setErrors({})
                  }}
                />
              )}
            </FormField>
            <FormField label={t('form.to')} error={errors.to} required>
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  value={to}
                  max={today}
                  onChange={(event) => {
                    setTo(event.target.value)
                    setErrors({})
                  }}
                />
              )}
            </FormField>
          </div>

          <div className={styles.presets} role="group" aria-label={t('form.presets')}>
            <Button variant="ghost" onClick={() => applyPreset(dhakaDay(Date.now() - 6 * DAY_MS))} disabled={busy}>
              {t('form.last7')}
            </Button>
            <Button variant="ghost" onClick={() => applyPreset(dhakaDay(Date.now() - 29 * DAY_MS))} disabled={busy}>
              {t('form.last30')}
            </Button>
            <Button variant="ghost" onClick={() => applyPreset(monthStart)} disabled={busy}>
              {t('form.thisMonth')}
            </Button>
          </div>

          <p className={styles.muted}>{t('form.hint', { max: formatNumber(MAX_RANGE_DAYS) })}</p>

          <div>
            <Button type="submit" loading={busy}>
              {t('form.generate')}
            </Button>
          </div>
        </form>
      </Card>

      {result.status === 'idle' && <p className={styles.muted}>{t('result.idle')}</p>}
      {result.status === 'loading' && <Loading label={t('loading')} />}
      {result.status === 'error' && (
        <EmptyState
          title={t('result.errorTitle')}
          description={t('result.errorText')}
          action={<Button onClick={() => void run()}>{t('common:actions.retry')}</Button>}
        />
      )}
      {result.status === 'ready' && (
        <ReportView key={result.report.generated_at} report={result.report} />
      )}
    </div>
  )
}
