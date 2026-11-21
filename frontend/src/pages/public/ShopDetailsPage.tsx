import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, EmptyState, Skeleton } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { getShopDetails, type ShopOffer } from '../../api/shops'
import ShopMedia from './ShopMedia'
import styles from './ShopDetailsPage.module.css'

const localeFor = (language: string) => (language.startsWith('bn') ? 'bn-BD' : 'en-GB')

// Opening hours are local shop times like "10:00". 1 January 2023 was a Sunday,
// so it is a safe date for turning a day number (0 = Sunday) into a weekday name.
function formatTime(time: string, locale: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2023, 0, 1, hours, minutes)))
}

function weekdayName(day: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2023, 0, 1 + day)),
  )
}

function Details({ shopId }: { shopId: string }) {
  const { t, i18n } = useTranslation('shopDetails')
  const locale = localeFor(i18n.language)
  const load = useCallback(() => getShopDetails(shopId), [shopId])
  const { state, retry } = useAsync(load)

  if (state.status === 'loading') {
    return (
      <div className={styles.container} aria-busy="true">
        <span className={styles.visuallyHidden} role="status">
          {t('common:states.loading')}
        </span>
        <Skeleton height="4rem" />
        <div className={styles.skeletons}>
          <Skeleton height="10rem" />
          <Skeleton height="10rem" />
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className={styles.container}>
        <EmptyState
          title={t('error.title')}
          description={t('error.description')}
          action={
            <Button variant="secondary" onClick={retry}>
              {t('common:actions.retry')}
            </Button>
          }
        />
      </div>
    )
  }

  const details = state.data
  if (details === null) {
    return (
      <div className={styles.container}>
        <EmptyState
          title={t('notFound.title')}
          description={t('notFound.description')}
          action={
            <Link className={styles.textLink} to="/shops">
              {t('notFound.action')}
            </Link>
          }
        />
      </div>
    )
  }

  const { shop, working_hours, services, offers, reviews } = details

  const number = new Intl.NumberFormat(locale)
  const oneDecimal = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  const taka = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  })
  const money = (poisha: number) => taka.format(poisha / 100)

  const rating = oneDecimal.format(shop.rating_average)
  const offeredServiceIds = new Set(offers.flatMap((offer) => offer.service_ids))
  const serviceNames = new Map(services.map((service) => [service.id, service.name]))

  const discountText = (offer: ShopOffer): string => {
    if (offer.offer_type === 'percentage' && offer.discount_percent !== null) {
      return t('offers.percentage', { percent: number.format(offer.discount_percent) })
    }
    if (offer.discount_poisha !== null) {
      return t(offer.offer_type === 'combo' ? 'offers.combo' : 'offers.fixed', {
        amount: money(offer.discount_poisha),
      })
    }
    return ''
  }

  return (
    <div className={styles.container}>
      <Link className={styles.back} to="/shops">
        {'\u2190 '}
        {t('back')}
      </Link>

      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{shop.name}</h1>
          <Badge>{t(`shops:gender.${shop.gender_category}`)}</Badge>
        </div>
        <p className={styles.meta}>
          {shop.area}, {shop.city}
        </p>
        <p className={styles.meta}>
          {shop.review_count > 0 ? (
            <>
              <span
                className={styles.rating}
                role="img"
                aria-label={t('shops:card.ratingLabel', { rating })}
              >
                {'\u2605 '}
                {rating}
              </span>{' '}
              ({t('shops:card.reviews', { count: shop.review_count })})
            </>
          ) : (
            t('shops:card.noReviews')
          )}
        </p>
        <p className={styles.description}>{shop.description}</p>
                <Link className={styles.bookButton} to={`/book/${shop.id}`}>
          {t('book:startCta')}
        </Link>
      </header>

      <ShopMedia shopId={shop.id} />

      <div className={styles.layout}>
        <div className={styles.column}>
          <section aria-labelledby="services-title">
            <h2 id="services-title" className={styles.sectionTitle}>
              {t('services.title')}
            </h2>
            {services.length === 0 ? (
              <p className={styles.muted}>{t('services.empty')}</p>
            ) : (
              <ul className={styles.list}>
                {services.map((service) => (
                  <li key={service.id}>
                    <Card padded>
                      <div className={styles.serviceRow}>
                        <div>
                          <h3 className={styles.itemTitle}>{service.name}</h3>
                          <p className={styles.meta}>
                            {t('services.duration', {
                              minutes: number.format(service.duration_minutes),
                            })}
                          </p>
                        </div>
                        <div className={styles.price}>
                          {t('services.price', { amount: money(service.price_poisha) })}
                          {offeredServiceIds.has(service.id) && (
                            <Badge variant="primary">{t('services.offer')}</Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {offers.length > 0 && (
            <section aria-labelledby="offers-title">
              <h2 id="offers-title" className={styles.sectionTitle}>
                {t('offers.title')}
              </h2>
              <ul className={styles.list}>
                {offers.map((offer) => (
                  <li key={offer.id}>
                    <Card padded>
                      <h3 className={styles.itemTitle}>{offer.title}</h3>
                      <p className={styles.discount}>{discountText(offer)}</p>
                      <p className={styles.meta}>
                        {t('offers.until', { date: dateFormat.format(new Date(offer.ends_at)) })}
                      </p>
                      {offer.service_ids.length > 0 && (
                        <p className={styles.meta}>
                          {t('offers.appliesTo', {
                            services: offer.service_ids
                              .map((id) => serviceNames.get(id))
                              .filter(Boolean)
                              .join(', '),
                          })}
                        </p>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="reviews-title">
            <h2 id="reviews-title" className={styles.sectionTitle}>
              {t('reviews.title', { count: number.format(reviews.length) })}
            </h2>
            {reviews.length === 0 ? (
              <p className={styles.muted}>{t('reviews.empty')}</p>
            ) : (
              <ul className={styles.list}>
                {reviews.map((review) => (
                  <li key={review.id}>
                    <Card padded>
                      <div className={styles.reviewTop}>
                        <span className={styles.itemTitle}>{review.customer_name}</span>
                        <span
                          className={styles.rating}
                          role="img"
                          aria-label={t('shops:card.ratingLabel', {
                            rating: oneDecimal.format(review.rating),
                          })}
                        >
                          {'\u2605 '}
                          {oneDecimal.format(review.rating)}
                        </span>
                      </div>
                      <p className={styles.meta}>
                        {dateFormat.format(new Date(review.created_at))}
                      </p>
                      <p>{review.comment}</p>
                      {review.owner_reply && (
                        <div className={styles.reply}>
                          <p className={styles.replyLabel}>{t('reviews.reply')}</p>
                          <p>{review.owner_reply}</p>
                        </div>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className={styles.column} aria-label={shop.name}>
          <Card padded>
            <h2 className={styles.sectionTitle}>{t('info.address')}</h2>
            <p>{shop.address}</p>
            <h2 className={styles.sectionTitle}>{t('info.phone')}</h2>
            <p>
              <a className={styles.textLink} href={`tel:${shop.phone}`}>
                {shop.phone}
              </a>
            </p>
            <h2 className={styles.sectionTitle}>{t('info.payments')}</h2>
            <div className={styles.tags}>
              {shop.allowed_payment_modes.map((mode) => (
                <Badge key={mode} variant="info">
                  {t(`payment.${mode}`)}
                </Badge>
              ))}
            </div>
            {shop.requires_booking_approval && (
              <p className={styles.meta}>{t('info.approval')}</p>
            )}
          </Card>

          <Card padded>
            <h2 className={styles.sectionTitle}>{t('hours.title')}</h2>
            <ul className={styles.hours}>
              {working_hours.map((row) => (
                <li key={row.day_of_week} className={styles.hoursRow}>
                  <span>{weekdayName(row.day_of_week, locale)}</span>
                  <span>
                    {row.is_closed
                      ? t('hours.closed')
                      : `${formatTime(row.opens_at, locale)} \u2013 ${formatTime(row.closes_at, locale)}`}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  )
}

// Remounted through its key when the shop id in the address changes, so every
// shop starts in the loading state.
export default function ShopDetailsPage() {
  const { shopId = '' } = useParams()
  return <Details key={shopId} shopId={shopId} />
}