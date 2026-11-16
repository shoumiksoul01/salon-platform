import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Skeleton } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { getShopMedia } from '../../api/shopMedia'
import type { ShopImage } from '../../mocks/shopMedia'
import styles from './ShopMedia.module.css'

const localeFor = (language: string) => (language.startsWith('bn') ? 'bn-BD' : 'en-GB')

function Gallery({ images }: { images: ShopImage[] }) {
  const { t, i18n } = useTranslation('shopMedia')
  const number = new Intl.NumberFormat(localeFor(i18n.language))
  const [index, setIndex] = useState(0)
  const current = images[index]

  function go(step: number) {
    setIndex((value) => (value + step + images.length) % images.length)
  }

  return (
    <div role="group" aria-label={t('gallery.label')}>
      <div className={styles.stage}>
        <img className={styles.image} src={current.url} alt={current.alt_text} />
        {images.length > 1 && (
          <>
            <button
              type="button"
              className={`${styles.arrow} ${styles.arrowPrev}`}
              aria-label={t('gallery.previous')}
              onClick={() => go(-1)}
            >
              {'\u2039'}
            </button>
            <button
              type="button"
              className={`${styles.arrow} ${styles.arrowNext}`}
              aria-label={t('gallery.next')}
              onClick={() => go(1)}
            >
              {'\u203A'}
            </button>
          </>
        )}
      </div>
      <p className={styles.position} aria-live="polite">
        {t('gallery.position', {
          current: number.format(index + 1),
          total: number.format(images.length),
        })}
      </p>
      {images.length > 1 && (
        <ul className={styles.thumbs}>
          {images.map((image, position) => (
            <li key={image.id}>
              <button
                type="button"
                className={
                  position === index ? `${styles.thumb} ${styles.thumbActive}` : styles.thumb
                }
                aria-label={t('gallery.show', { number: number.format(position + 1) })}
                aria-pressed={position === index}
                onClick={() => setIndex(position)}
              >
                <img className={styles.thumbImage} src={image.url} alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ShopMedia({ shopId }: { shopId: string }) {
  const { t } = useTranslation('shopMedia')
  const load = useCallback(() => getShopMedia(shopId), [shopId])
  const { state, retry } = useAsync(load)

  if (state.status === 'loading') {
    return (
      <div className={styles.media} aria-busy="true">
        <span className={styles.visuallyHidden} role="status">
          {t('common:states.loading')}
        </span>
        <Skeleton height="16rem" />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className={styles.media}>
        <p className={styles.muted}>{t('error.message')}</p>
        <Button variant="secondary" onClick={retry}>
          {t('common:actions.retry')}
        </Button>
      </div>
    )
  }

  const { images, tour_url } = state.data
  if (images.length === 0 && !tour_url) return null

  return (
    <section className={styles.media} aria-labelledby="media-title">
      <h2 id="media-title" className={styles.title}>
        {t('title')}
      </h2>
      {images.length > 0 && <Gallery images={images} />}
      {tour_url && (
        <div className={styles.tour}>
          <h3 className={styles.tourTitle}>{t('tour.title')}</h3>
          <p className={styles.muted}>{t('tour.description')}</p>
          <a className={styles.tourLink} href={tour_url} target="_blank" rel="noopener noreferrer">
            {t('tour.open')}
            <span className={styles.visuallyHidden}> {t('tour.newTab')}</span>
          </a>
        </div>
      )}
    </section>
  )
}