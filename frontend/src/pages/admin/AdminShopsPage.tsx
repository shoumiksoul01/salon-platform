import { useState } from 'react'
import type { SyntheticEvent } from 'react'
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
import { decideShop, listAdminShops } from '../../api/adminShops'
import type { AdminShop, ShopDecision, ShopStatus } from '../../api/adminShops'
import { useAsync } from '../../hooks/useAsync'
import styles from './AdminShopsPage.module.css'

const STATUSES: ShopStatus[] = ['pending', 'approved', 'rejected', 'suspended']

const STATUS_VARIANT: Record<ShopStatus, BadgeVariant> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  suspended: 'neutral',
}

interface DialogState {
  shopId: string
  step: 'view' | 'reject' | 'suspend'
}

// ADM-02: review, approve, reject and suspend shops (FR-10.1)
export default function AdminShopsPage() {
  const { t, i18n } = useTranslation('adminShops')
  const toast = useToast()
  const { state, retry } = useAsync(listAdminShops)

  const [updates, setUpdates] = useState<Record<string, AdminShop>>({})
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [saving, setSaving] = useState(false)

  const locale = i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB'
  const numbers = new Intl.NumberFormat(locale)
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'Asia/Dhaka' })

  const shops =
    state.status === 'ready' ? state.data.map((shop) => updates[shop.id] ?? shop) : []
  const selected = shops.find((shop) => shop.id === dialog?.shopId)

  function openDialog(shopId: string, step: DialogState['step']) {
    setReason('')
    setReasonError('')
    setDialog({ shopId, step })
  }

  async function decide(shop: AdminShop, decision: ShopDecision) {
    setSaving(true)
    try {
      const updated = await decideShop(shop.id, decision, reason)
      setUpdates((current) => ({ ...current, [updated.id]: updated }))
      setDialog((current) => (current?.shopId === shop.id ? null : current))
      toast.show({ message: t(`done.${decision}`, { name: shop.name }), variant: 'success' })
    } catch {
      toast.show({ message: t('failed'), variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  function submitReason(event?: SyntheticEvent) {
    event?.preventDefault()
    if (!selected || !dialog || dialog.step === 'view' || saving) return
    if (!reason.trim()) {
      setReasonError(t('reason.required'))
      return
    }
    void decide(selected, dialog.step)
  }

  const columns: TableColumn<AdminShop>[] = [
    {
      key: 'shop',
      header: t('table.shop'),
      render: (shop) => (
        <>
          <span className={styles.name}>{shop.name}</span>
          <span className={styles.muted}>{shop.area}</span>
        </>
      ),
    },
    { key: 'owner', header: t('table.owner'), render: (shop) => shop.owner_name },
    {
      key: 'registered',
      header: t('table.registered'),
      render: (shop) => dates.format(new Date(shop.created_at)),
    },
    {
      key: 'action',
      header: t('table.action'),
      align: 'end',
      render: (shop) => (
        <Button
          type="button"
          variant="secondary"
          aria-label={t('table.reviewShop', { name: shop.name })}
          onClick={() => openDialog(shop.id, 'view')}
        >
          {t('table.review')}
        </Button>
      ),
    },
  ]

  const tabs = STATUSES.map((status) => {
    const rows = shops
      .filter((shop) => shop.status === status)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
    return {
      id: status,
      label: `${t(`status.${status}`)} (${numbers.format(rows.length)})`,
      content:
        rows.length > 0 ? (
          <Table
            columns={columns}
            rows={rows}
            getRowKey={(shop) => shop.id}
            caption={t('table.caption')}
          />
        ) : (
          <EmptyState title={t(`empty.${status}`)} description={t('empty.hint')} />
        ),
    }
  })

  function renderFooter() {
    if (!selected || !dialog) return undefined

    if (dialog.step !== 'view') {
      return (
        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => openDialog(selected.id, 'view')}
          >
            {t('actions.back')}
          </Button>
          <Button type="button" variant="danger" loading={saving} onClick={() => submitReason()}>
            {t(dialog.step === 'reject' ? 'actions.confirmReject' : 'actions.confirmSuspend')}
          </Button>
        </div>
      )
    }

    if (selected.status === 'pending') {
      return (
        <div className={styles.actions}>
          <Button
            type="button"
            variant="danger"
            disabled={saving}
            onClick={() => openDialog(selected.id, 'reject')}
          >
            {t('actions.reject')}
          </Button>
          <Button type="button" loading={saving} onClick={() => void decide(selected, 'approve')}>
            {t('actions.approve')}
          </Button>
        </div>
      )
    }

    if (selected.status === 'approved') {
      return (
        <div className={styles.actions}>
          <Button type="button" variant="danger" onClick={() => openDialog(selected.id, 'suspend')}>
            {t('actions.suspend')}
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

      {state.status === 'ready' && <Tabs tabs={tabs} label={t('tabsLabel')} />}

      <Modal
        open={Boolean(selected)}
        onClose={() => setDialog(null)}
        title={selected?.name ?? ''}
        closeLabel={t('common:actions.close')}
        footer={renderFooter()}
      >
        {selected && dialog?.step === 'view' && (
          <>
            <dl className={styles.details}>
              <dt>{t('details.status')}</dt>
              <dd>
                <Badge variant={STATUS_VARIANT[selected.status]}>
                  {t(`status.${selected.status}`)}
                </Badge>
              </dd>
              {selected.approval_reason && (
                <>
                  <dt>{t('details.reason')}</dt>
                  <dd>{selected.approval_reason}</dd>
                </>
              )}
              <dt>{t('details.owner')}</dt>
              <dd>{selected.owner_name}</dd>
              <dt>{t('details.phone')}</dt>
              <dd>{selected.phone}</dd>
              <dt>{t('details.address')}</dt>
              <dd>
                {selected.address}, {selected.city}
              </dd>
              <dt>{t('details.category')}</dt>
              <dd>{t(`category.${selected.gender_category}`)}</dd>
              <dt>{t('details.registered')}</dt>
              <dd>{dates.format(new Date(selected.created_at))}</dd>
              {selected.description && (
                <>
                  <dt>{t('details.description')}</dt>
                  <dd>{selected.description}</dd>
                </>
              )}
              <dt>{t('details.location')}</dt>
              <dd>
                <a
                  className={styles.link}
                  href={`https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}#map=17/${selected.latitude}/${selected.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('details.map')}
                </a>
              </dd>
            </dl>

            <h3>{t('details.documents')}</h3>
            {selected.documents.length > 0 ? (
              <ul className={styles.documents}>
                {selected.documents.map((document) => (
                  <li key={document.id}>
                    {document.file_url ? (
                      <a
                        className={styles.link}
                        href={document.file_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {document.file_name}
                      </a>
                    ) : (
                      document.file_name
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>{t('details.noDocuments')}</p>
            )}
          </>
        )}

        {selected && dialog && dialog.step !== 'view' && (
          <form onSubmit={submitReason} noValidate>
            <FormField label={t(`reason.${dialog.step}`)} error={reasonError} required>
              {(control) => (
                <Input
                  {...control}
                  value={reason}
                  maxLength={300}
                  onChange={(event) => {
                    setReason(event.target.value)
                    setReasonError('')
                  }}
                />
              )}
            </FormField>
          </form>
        )}
      </Modal>
    </div>
  )
}