import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Modal,
  Pagination,
  Select,
  Skeleton,
  StatTile,
  Tabs,
  useToast,
} from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { useBookingFormat } from '../../hooks/useBookingFormat'
import { REPLY_MAX, ReviewReplyError, listOwnerReviews, saveReviewReply } from '../../api/ownerReviews'
import type { OwnerReview } from '../../api/ownerReviews'
import styles from './ReviewsPage.module.css'

// OWN-08: owner reviews (FR-08.2, reply to a review).
// Tabs: All, Needs reply, Replied. A star filter narrows the list. The owner writes one reply
// per review and can change it later. Reviews themselves cannot be edited or deleted here.

type TabId = 'all' | 'needsReply' | 'replied'

const TAB_IDS: TabId[] = ['all', 'needsReply', 'replied']
const STAR_VALUES = [5, 4, 3, 2, 1]
const PAGE_SIZE = 6

const needsReply = (review: OwnerReview) => review.owner_reply === null

function listFor(tab: TabId, all: OwnerReview[]): OwnerReview[] {
  switch (tab) {
    case 'all':
      return all
    case 'needsReply':
      return all.filter(needsReply)
    case 'replied':
      return all.filter((review) => !needsReply(review))
  }
}

function useNumber() {
  const { i18n } = useTranslation()
  const locale = i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB'
  const whole = new Intl.NumberFormat(locale)
  const oneDecimal = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return {
    whole: (value: number) => whole.format(value),
    decimal: (value: number) => oneDecimal.format(value),
  }
}

function Loading({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={styles.loading}>
      {[1, 2, 3].map((n) => (
        <Card key={n}>
          <Skeleton width="35%" />
          <Skeleton width="80%" />
          <Skeleton width="50%" />
        </Card>
      ))}
    </div>
  )
}

// Five stars drawn as text. The words for screen readers carry the meaning, the stars are a hint.
function Stars({ rating }: { rating: number }) {
  const { t } = useTranslation('ownerReviews')
  return (
    <span className={styles.stars}>
      <span aria-hidden="true">
        <span className={styles.starOn}>{'★'.repeat(rating)}</span>
        <span className={styles.starOff}>{'★'.repeat(5 - rating)}</span>
      </span>
      <span className={styles.srOnly}>{t('stars', { rating })}</span>
    </span>
  )
}

interface ReplyDialogProps {
  review: OwnerReview
  onClose: () => void
  onDone: (updated: OwnerReview, wasEdit: boolean) => void
}

// Write a new reply or change the old one. It is mounted only while needed, with a key per review.
function ReplyDialog({ review, onClose, onDone }: ReplyDialogProps) {
  const { t } = useTranslation('ownerReviews')
  const toast = useToast()
  const { whole } = useNumber()
  const wasEdit = review.owner_reply !== null
  const [text, setText] = useState(review.owner_reply ?? '')
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = text.trim()
    if (trimmed.length === 0) {
      setError(t('dialog.empty'))
      return
    }
    if (trimmed.length > REPLY_MAX) {
      setError(t('dialog.tooLong', { max: whole(REPLY_MAX) }))
      return
    }
    setBusy(true)
    try {
      const updated = await saveReviewReply(review.id, trimmed)
      onDone(updated, wasEdit)
    } catch (caught) {
      if (caught instanceof ReviewReplyError && caught.code === 'empty') setError(t('dialog.empty'))
      else toast.show({ message: t('toast.failed'), variant: 'danger' })
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={wasEdit ? t('dialog.editTitle') : t('dialog.title')}
      closeLabel={t('common:actions.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form="review-reply-form" loading={busy}>
            {wasEdit ? t('dialog.saveEdit') : t('dialog.send')}
          </Button>
        </>
      }
    >
      <div className={styles.quote}>
        <p className={styles.quoteHead}>
          {review.customer_name} · <Stars rating={review.rating} />
        </p>
        <p className={styles.quoteText}>{review.comment || t('noComment')}</p>
      </div>

      <form id="review-reply-form" onSubmit={handleSubmit} noValidate>
        <FormField label={t('dialog.label')} hint={t('dialog.hint')} error={error} required>
          {(control) => (
            <>
              <textarea
                id={control.id}
                aria-describedby={control['aria-describedby']}
                aria-invalid={control.invalid || undefined}
                required={control.required}
                className={styles.textarea}
                rows={5}
                value={text}
                onChange={(event) => {
                  setText(event.target.value)
                  setError(undefined)
                }}
              />
              <p className={styles.counter}>
                {t('dialog.counter', { used: whole(text.trim().length), max: whole(REPLY_MAX) })}
              </p>
            </>
          )}
        </FormField>
      </form>
    </Modal>
  )
}

function ReviewItem({ review, onReply }: { review: OwnerReview; onReply: (review: OwnerReview) => void }) {
  const { t } = useTranslation('ownerReviews')
  const format = useBookingFormat()

  return (
    <Card as="article">
      <div className={styles.head}>
        <p className={styles.customer}>{review.customer_name}</p>
        <p className={styles.date}>{format.date(review.created_at)}</p>
      </div>
      <Stars rating={review.rating} />
      <p className={review.comment ? styles.comment : styles.muted}>{review.comment || t('noComment')}</p>

      {review.owner_reply ? (
        <div className={styles.reply}>
          <p className={styles.replyHead}>
            <span className={styles.replyLabel}>{t('yourReply')}</span>
            {review.owner_replied_at && <span className={styles.date}>{format.date(review.owner_replied_at)}</span>}
          </p>
          <p className={styles.replyText}>{review.owner_reply}</p>
        </div>
      ) : (
        <div className={styles.noReply}>
          <Badge variant="warning">{t('needsReplyBadge')}</Badge>
        </div>
      )}

      <div className={styles.actions}>
        <Button
          variant={review.owner_reply ? 'secondary' : 'primary'}
          onClick={() => onReply(review)}
          aria-label={`${review.owner_reply ? t('editReply') : t('reply')}: ${review.customer_name}`}
        >
          {review.owner_reply ? t('editReply') : t('reply')}
        </Button>
      </div>
    </Card>
  )
}

function Content({ initial }: { initial: OwnerReview[] }) {
  const { t } = useTranslation('ownerReviews')
  const toast = useToast()
  const { whole, decimal } = useNumber()
  const [list, setList] = useState(initial)
  const [tab, setTab] = useState<TabId>('all')
  const [stars, setStars] = useState('')
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<OwnerReview | null>(null)

  const total = list.length
  const waiting = list.filter(needsReply).length
  const average = total > 0 ? list.reduce((sum, review) => sum + review.rating, 0) / total : 0

  const filtered = stars ? list.filter((review) => String(review.rating) === stars) : list
  const waitingInView = filtered.filter(needsReply).length

  function handleDone(updated: OwnerReview, wasEdit: boolean) {
    setList((previous) => previous.map((item) => (item.id === updated.id ? updated : item)))
    setDialog(null)
    toast.show({ message: wasEdit ? t('toast.updated') : t('toast.sent'), variant: 'success' })
  }

  function panel(id: TabId) {
    const rows = listFor(id, filtered)
    if (rows.length === 0) {
      const key = stars ? 'filtered' : id
      return <EmptyState title={t(`empty.${key}.title`)} description={t(`empty.${key}.text`)} />
    }
    const pageCount = Math.ceil(rows.length / PAGE_SIZE)
    const current = Math.min(page, pageCount) // a page can disappear when its last review changes tab
    const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
    return (
      <div className={styles.panel}>
        <ul className={styles.list}>
          {shown.map((review) => (
            <li key={review.id}>
              <ReviewItem review={review} onReply={setDialog} />
            </li>
          ))}
        </ul>
        <Pagination
          page={current}
          pageCount={pageCount}
          onPageChange={setPage}
          labels={{
            nav: t('pagination.nav'),
            previous: t('pagination.previous'),
            next: t('pagination.next'),
            status: t('pagination.status', { page: whole(current), total: whole(pageCount) }),
          }}
        />
      </div>
    )
  }

  if (total === 0) {
    return (
      <>
        <h1 className={styles.title}>{t('title')}</h1>
        <EmptyState title={t('empty.none.title')} description={t('empty.none.text')} />
      </>
    )
  }

  return (
    <>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{t('title')}</h1>
        <FormField label={t('starsFilter')}>
          {(control) => (
            <Select
              {...control}
              value={stars}
              onChange={(event) => {
                setStars(event.target.value)
                setPage(1)
              }}
            >
              <option value="">{t('allStars')}</option>
              {STAR_VALUES.map((value) => (
                <option key={value} value={value}>
                  {t('stars', { rating: value })}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>
      <p className={styles.muted}>{t('intro')}</p>

      <div className={styles.tiles}>
        <StatTile label={t('tiles.average')} value={t('tiles.averageValue', { value: decimal(average) })} />
        <StatTile label={t('tiles.total')} value={whole(total)} />
        <StatTile label={t('tiles.waiting')} value={whole(waiting)} />
      </div>

      <Tabs
        label={t('tabsLabel')}
        defaultTab={tab}
        onChange={(id) => {
          setTab(id as TabId)
          setPage(1)
        }}
        tabs={TAB_IDS.map((id) => ({
          id,
          label:
            id === 'needsReply' && waitingInView > 0
              ? t('tabs.needsReplyCount', { number: whole(waitingInView) })
              : t(`tabs.${id}`),
          content: panel(id),
        }))}
      />

      {dialog && (
        <ReplyDialog key={dialog.id} review={dialog} onClose={() => setDialog(null)} onDone={handleDone} />
      )}
    </>
  )
}

// The layout provides the one <main>, so this page renders a <div>.
export default function ReviewsPage() {
  const { t } = useTranslation('ownerReviews')
  const { state, retry } = useAsync(listOwnerReviews)

  return (
    <div className={styles.page}>
      {state.status === 'loading' && <Loading label={t('loading')} />}
      {state.status === 'error' && (
        <EmptyState
          title={t('common:states.error')}
          action={<Button onClick={retry}>{t('common:actions.retry')}</Button>}
        />
      )}
      {state.status === 'ready' && <Content initial={state.data} />}
    </div>
  )
}
