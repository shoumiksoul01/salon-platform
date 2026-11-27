import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  EmptyState,
  FormField,
  Input,
  Modal,
  Skeleton,
  Table,
  Tabs,
  useToast,
} from '../../components/ui'
import type { BadgeVariant } from '../../components/ui'
import type { TableColumn } from '../../components/ui/Table'
import { getModeration, handleComplaint, handleReport } from '../../api/adminModeration'
import type {
  AuditLog,
  Complaint,
  ComplaintStatus,
  Moderation,
  ReportStatus,
  ReviewReport,
} from '../../api/adminModeration'
import { useAsync } from '../../hooks/useAsync'
import styles from './AdminModerationPage.module.css'

const REPORT_VARIANT: Record<ReportStatus, BadgeVariant> = {
  open: 'warning',
  dismissed: 'success',
  review_hidden: 'neutral',
}

const COMPLAINT_VARIANT: Record<ComplaintStatus, BadgeVariant> = {
  open: 'warning',
  in_review: 'info',
  resolved: 'success',
  rejected: 'neutral',
}

interface Selection {
  kind: 'report' | 'complaint'
  id: string
}

const isUnfinished = (status: ReportStatus | ComplaintStatus) =>
  status === 'open' || status === 'in_review'

// Unfinished items first, then the oldest first.
function byPriority<T extends ReviewReport | Complaint>(list: T[]): T[] {
  return [...list].sort(
    (a, b) =>
      Number(isUnfinished(b.status)) - Number(isUnfinished(a.status)) ||
      a.created_at.localeCompare(b.created_at),
  )
}

// ADM-03: reported reviews, complaints and the audit log (FR-10.2)
export default function AdminModerationPage() {
  const { t, i18n } = useTranslation('adminModeration')
  const toast = useToast()
  const { state, retry } = useAsync(getModeration)

  const [updated, setUpdated] = useState<Moderation | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [resolution, setResolution] = useState('')
  const [resolutionError, setResolutionError] = useState('')
  const [saving, setSaving] = useState(false)

  const locale = i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB'
  const numbers = new Intl.NumberFormat(locale)
  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  const dates = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Dhaka',
  })
  const formatDate = (iso: string) => dates.format(new Date(iso))

  const data = updated ?? (state.status === 'ready' ? state.data : null)
  const report =
    selection?.kind === 'report'
      ? data?.reports.find((item) => item.id === selection.id)
      : undefined
  const complaint =
    selection?.kind === 'complaint'
      ? data?.complaints.find((item) => item.id === selection.id)
      : undefined

  function open(kind: Selection['kind'], id: string) {
    setResolution('')
    setResolutionError('')
    setSelection({ kind, id })
  }

  async function save(action: () => Promise<Moderation>) {
    setSaving(true)
    try {
      setUpdated(await action())
      setSelection(null)
      toast.show({ message: t('saved'), variant: 'success' })
    } catch {
      toast.show({ message: t('failed'), variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  function closeComplaint(id: string, decision: 'resolve' | 'reject') {
    if (!resolution.trim()) {
      setResolutionError(t('resolution.required'))
      return
    }
    void save(() => handleComplaint(id, decision, resolution))
  }

  const viewButton = (kind: Selection['kind'], id: string, name: string) => (
    <Button
      type="button"
      variant="secondary"
      aria-label={t('actions.viewItem', { name })}
      onClick={() => open(kind, id)}
    >
      {t('actions.view')}
    </Button>
  )

  const reportColumns: TableColumn<ReviewReport>[] = [
    {
      key: 'shop',
      header: t('columns.shop'),
      render: (row) => (
        <>
          <span className={styles.name}>{row.shop_name}</span>
          <span className={styles.muted}>{row.customer_name}</span>
        </>
      ),
    },
    { key: 'reason', header: t('columns.reason'), render: (row) => row.reason },
    { key: 'opened', header: t('columns.opened'), render: (row) => formatDate(row.created_at) },
    {
      key: 'status',
      header: t('columns.status'),
      render: (row) => (
        <Badge variant={REPORT_VARIANT[row.status]}>{t(`reportStatus.${row.status}`)}</Badge>
      ),
    },
    {
      key: 'action',
      header: t('columns.action'),
      align: 'end',
      render: (row) => viewButton('report', row.id, row.shop_name),
    },
  ]

  const complaintColumns: TableColumn<Complaint>[] = [
    {
      key: 'customer',
      header: t('columns.customer'),
      render: (row) => (
        <>
          <span className={styles.name}>{row.customer_name}</span>
          <span className={styles.muted}>{row.shop_name}</span>
        </>
      ),
    },
    {
      key: 'type',
      header: t('columns.type'),
      render: (row) => t(`complaintType.${row.complaint_type}`),
    },
    { key: 'opened', header: t('columns.opened'), render: (row) => formatDate(row.created_at) },
    {
      key: 'status',
      header: t('columns.status'),
      render: (row) => (
        <Badge variant={COMPLAINT_VARIANT[row.status]}>
          {t(`complaintStatus.${row.status}`)}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: t('columns.action'),
      align: 'end',
      render: (row) => viewButton('complaint', row.id, row.customer_name),
    },
  ]

  const auditColumns: TableColumn<AuditLog>[] = [
    { key: 'when', header: t('columns.when'), render: (row) => formatDate(row.created_at) },
    { key: 'admin', header: t('columns.admin'), render: (row) => row.actor_name },
    { key: 'action', header: t('columns.action'), render: (row) => t(`auditAction.${row.action}`) },
    {
      key: 'target',
      header: t('columns.target'),
      render: (row) => (
        <>
          <span className={styles.name}>{row.details.target}</span>
          <span className={styles.muted}>{t(`entity.${row.entity_type}`)}</span>
        </>
      ),
    },
    { key: 'note', header: t('columns.note'), render: (row) => row.details.note },
  ]

  function listOrEmpty<Row extends { id: string }>(
    name: 'reports' | 'complaints' | 'audit',
    columns: TableColumn<Row>[],
    rows: Row[],
  ) {
    return rows.length > 0 ? (
      <Table
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        caption={t(`tabs.${name}`)}
      />
    ) : (
      <EmptyState title={t(`empty.${name}`)} description={t('empty.hint')} />
    )
  }

  const countLabel = (name: 'reports' | 'complaints', list: (ReviewReport | Complaint)[]) =>
    `${t(`tabs.${name}`)} (${numbers.format(list.filter((item) => isUnfinished(item.status)).length)})`

  const tabs = data
    ? [
        {
          id: 'reports',
          label: countLabel('reports', data.reports),
          content: listOrEmpty('reports', reportColumns, byPriority(data.reports)),
        },
        {
          id: 'complaints',
          label: countLabel('complaints', data.complaints),
          content: listOrEmpty('complaints', complaintColumns, byPriority(data.complaints)),
        },
        {
          id: 'audit',
          label: t('tabs.audit'),
          content: listOrEmpty('audit', auditColumns, data.audit),
        },
      ]
    : []

  function renderFooter() {
    if (report?.status === 'open') {
      return (
        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => void save(() => handleReport(report.id, 'keep'))}
          >
            {t('actions.keep')}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={saving}
            onClick={() => void save(() => handleReport(report.id, 'hide'))}
          >
            {t('actions.hide')}
          </Button>
        </div>
      )
    }

    if (complaint && isUnfinished(complaint.status)) {
      return (
        <div className={styles.actions}>
          {complaint.status === 'open' && (
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => void save(() => handleComplaint(complaint.id, 'start'))}
            >
              {t('actions.start')}
            </Button>
          )}
          <Button
            type="button"
            variant="danger"
            disabled={saving}
            onClick={() => closeComplaint(complaint.id, 'reject')}
          >
            {t('actions.reject')}
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => closeComplaint(complaint.id, 'resolve')}
          >
            {t('actions.resolve')}
          </Button>
        </div>
      )
    }

    return undefined
  }

  return (
    <div className={styles.page}>
      <header>
        <h1>{t('title')}</h1>
        <p className={styles.intro}>{t('intro')}</p>
      </header>

      {state.status === 'loading' && <Skeleton width="100%" height="16rem" />}

      {state.status === 'error' && (
        <div className={styles.error} role="alert">
          <EmptyState title={t('error.title')} description={t('error.hint')} />
          <Button type="button" onClick={retry}>
            {t('error.retry')}
          </Button>
        </div>
      )}

      {data && <Tabs tabs={tabs} label={t('tabsLabel')} />}

      <Modal
        open={Boolean(report || complaint)}
        onClose={() => setSelection(null)}
        title={report?.shop_name ?? complaint?.customer_name ?? ''}
        closeLabel={t('common:actions.close')}
        footer={renderFooter()}
      >
        {report && (
          <dl className={styles.details}>
            <dt>{t('details.reviewer')}</dt>
            <dd>{report.customer_name}</dd>
            <dt>{t('details.rating')}</dt>
            <dd>{t('details.ratingValue', { rating: numbers.format(report.rating) })}</dd>
            <dt>{t('details.review')}</dt>
            <dd>{report.comment || t('details.noComment')}</dd>
            <dt>{t('details.reporter')}</dt>
            <dd>{report.reporter_name}</dd>
            <dt>{t('columns.reason')}</dt>
            <dd>{report.reason}</dd>
          </dl>
        )}

        {complaint && (
          <>
            <dl className={styles.details}>
              <dt>{t('columns.shop')}</dt>
              <dd>{complaint.shop_name}</dd>
              <dt>{t('columns.type')}</dt>
              <dd>{t(`complaintType.${complaint.complaint_type}`)}</dd>
              <dt>{t('details.visit')}</dt>
              <dd>{formatDate(complaint.booking_starts_at)}</dd>
              <dt>{t('details.total')}</dt>
              <dd>{money.format(complaint.total_poisha / 100)}</dd>
              <dt>{t('details.paid')}</dt>
              <dd>{money.format(complaint.paid_poisha / 100)}</dd>
              <dt>{t('details.description')}</dt>
              <dd>{complaint.description}</dd>
              {complaint.resolution && (
                <>
                  <dt>{t('details.resolution')}</dt>
                  <dd>{complaint.resolution}</dd>
                </>
              )}
            </dl>

            {isUnfinished(complaint.status) && (
              <>
                <FormField label={t('resolution.label')} error={resolutionError}>
                  {(control) => (
                    <Input
                      {...control}
                      value={resolution}
                      maxLength={300}
                      onChange={(event) => {
                        setResolution(event.target.value)
                        setResolutionError('')
                      }}
                    />
                  )}
                </FormField>
                <p className={styles.muted}>{t('details.refundNote')}</p>
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}