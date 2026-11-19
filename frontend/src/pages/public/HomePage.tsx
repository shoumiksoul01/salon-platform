import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, EmptyState, Input, Skeleton } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import {
  listFeaturedOffers,
  listNearbyShops,
  type FeaturedOffer,
  type NearbyShop,
} from '../../api/shops'
import styles from './HomePage.module.css'

// Files in frontend/public/hero/ (the video is added in its own commit).
const HERO_VIDEO = '/hero/hero.mp4'
const HERO_POSTER = '/hero/hero-poster.jpg'

// Stable functions, so useAsync does not reload on every render.
const loadNearby = () => listNearbyShops(6)
const loadOffers = () => listFeaturedOffers(4)

const localeFor = (language: string) => (language.startsWith('bn') ? 'bn-BD' : 'en-GB')

function LoadingGrid({ label }: { label: string }) {
  return (
    <div className={styles.grid} aria-busy="true">
      <span className={styles.visuallyHidden} role="status">
        {label}
      </span>
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} height="7rem" />
      ))}
    </div>
  )
}

function ShopCard({ shop }: { shop: NearbyShop }) {
  const { t, i18n } = useTranslation('home')
  const locale = localeFor(i18n.language)
  const oneDecimal = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  const rating = oneDecimal.format(shop.rating_average)

  return (
    <li className={styles.item}>
      <Card interactive>
        <div className={styles.cardTop}>
          <h3 className={styles.cardTitle}>
            <Link className={styles.stretch} to={`/shops/${shop.id}`}>
              {shop.name}
            </Link>
          </h3>
          <Badge>{t(`gender.${shop.gender_category}`)}</Badge>
        </div>
        <p className={styles.meta}>
          {shop.area}, {shop.city}
        </p>
        <p className={styles.meta}>
          {shop.review_count > 0 ? (
            <>
              <span className={styles.rating} role="img" aria-label={t('ratingLabel', { rating })}>
                ★ {rating}
              </span>{' '}
              ({t('reviews', { count: shop.review_count })})
            </>
          ) : (
            t('noReviews')
          )}
          {' · '}
          {t('nearby.distance', { km: oneDecimal.format(shop.distance_km) })}
        </p>
      </Card>
    </li>
  )
}

function OfferCard({ offer }: { offer: FeaturedOffer }) {
  const { t, i18n } = useTranslation('home')
  const locale = localeFor(i18n.language)

  let discount = ''
  if (offer.discount_percent !== null) {
    discount = t('featured.percentOff', { percent: offer.discount_percent })
  } else if (offer.discount_poisha !== null) {
    const taka = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
      offer.discount_poisha / 100,
    )
    discount = t('featured.saveAmount', { amount: `\u09F3${taka}` })
  }

  const until = new Date(offer.ends_at).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <li className={styles.item}>
      <Card interactive>
        <Badge variant="primary">{discount}</Badge>
        <h3 className={styles.offerTitle}>
          <Link className={styles.stretch} to={`/shops/${offer.shop_id}`}>
            {offer.title}
          </Link>
        </h3>
        <p className={styles.meta}>{offer.shop_name}</p>
        <p className={styles.meta}>{t('featured.validUntil', { date: until })}</p>
      </Card>
    </li>
  )
}

function NearbySection() {
  const { t } = useTranslation('home')
  const { state, retry } = useAsync(loadNearby)

  return (
    <section className={styles.section} aria-labelledby="nearby-title">
      <div className={styles.container}>
        <h2 id="nearby-title" className={styles.sectionTitle}>
          {t('nearby.title')}
        </h2>
        <p className={styles.sectionSubtitle}>{t('nearby.subtitle')}</p>
        {state.status === 'loading' && <LoadingGrid label={t('common:states.loading')} />}
        {state.status === 'error' && (
          <EmptyState
            title={t('nearby.errorTitle')}
            description={t('nearby.errorDescription')}
            action={
              <Button variant="secondary" onClick={retry}>
                {t('common:actions.retry')}
              </Button>
            }
          />
        )}
        {state.status === 'ready' && state.data.length === 0 && (
          <EmptyState title={t('nearby.emptyTitle')} description={t('nearby.emptyDescription')} />
        )}
        {state.status === 'ready' && state.data.length > 0 && (
          <ul className={styles.grid}>
            {state.data.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function OffersSection() {
  const { t } = useTranslation('home')
  const { state, retry } = useAsync(loadOffers)

  return (
    <section className={styles.section} aria-labelledby="offers-title">
      <div className={styles.container}>
        <h2 id="offers-title" className={styles.sectionTitle}>
          {t('featured.title')}
        </h2>
        <p className={styles.sectionSubtitle}>{t('featured.subtitle')}</p>
        {state.status === 'loading' && <LoadingGrid label={t('common:states.loading')} />}
        {state.status === 'error' && (
          <EmptyState
            title={t('featured.errorTitle')}
            description={t('featured.errorDescription')}
            action={
              <Button variant="secondary" onClick={retry}>
                {t('common:actions.retry')}
              </Button>
            }
          />
        )}
        {state.status === 'ready' && state.data.length === 0 && (
          <EmptyState
            title={t('featured.emptyTitle')}
            description={t('featured.emptyDescription')}
          />
        )}
        {state.status === 'ready' && state.data.length > 0 && (
          <ul className={styles.grid}>
            {state.data.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function Hero() {
  const { t } = useTranslation('home')
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [query, setQuery] = useState('')
  const [playing, setPlaying] = useState(true)
  const [videoFailed, setVideoFailed] = useState(false)

  const showVideo = !reduceMotion && !videoFailed

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = query.trim()
    navigate(trimmed ? `/shops?q=${encodeURIComponent(trimmed)}` : '/shops')
  }

  function togglePlayback() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play()
    } else {
      video.pause()
    }
  }

  return (
    <section className={styles.hero} aria-labelledby="home-title">
      {showVideo && (
        <video
          ref={videoRef}
          className={styles.video}
          src={HERO_VIDEO}
          poster={HERO_POSTER}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          tabIndex={-1}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setVideoFailed(true)}
        />
      )}
      {reduceMotion && <img className={styles.video} src={HERO_POSTER} alt="" />}
      <div className={styles.overlay} aria-hidden="true" />

      <div className={styles.heroContent}>
        <h1 id="home-title" className={styles.title}>
          {t('hero.title')}
        </h1>
        <p className={styles.subtitle}>{t('hero.subtitle')}</p>
        <form className={styles.search} role="search" onSubmit={handleSubmit}>
          <div className={styles.searchField}>
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('hero.searchPlaceholder')}
              aria-label={t('hero.searchLabel')}
            />
          </div>
          <Button type="submit">{t('hero.searchButton')}</Button>
        </form>
        <Link className={styles.browse} to="/shops">
          {t('hero.browseAll')}
        </Link>
      </div>

      {showVideo && (
        <button
          type="button"
          className={styles.pause}
          onClick={togglePlayback}
          aria-label={playing ? t('heroVideo:pause') : t('heroVideo:play')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            {playing ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M8 5v14l11-7z" />}
          </svg>
        </button>
      )}
    </section>
  )
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <NearbySection />
      <OffersSection />
    </>
  )
}