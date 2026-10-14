import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  FormField,
  Input,
  Select,
  Skeleton,
} from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { searchShops, type ShopFilters, type ShopResult } from '../../api/shops'
import styles from './ShopsPage.module.css'

const GENDERS = ['men', 'women', 'unisex'] as const
const RATINGS = [3, 4, 4.5]
const DISTANCES = [2, 5, 10]
const PRICES_TAKA = [500, 1000, 2000, 3000]

const localeFor = (language: string) => (language.startsWith('bn') ? 'bn-BD' : 'en-GB')

function pick(value: string | null, allowed: number[]): number {
  const number = Number(value)
  return allowed.includes(number) ? number : 0
}

// The address is the source of truth: unknown or invalid values fall back to "no filter".
function readFilters(params: URLSearchParams): ShopFilters {
  const gender = params.get('gender')
  const sort = params.get('sort')
  return {
    q: (params.get('q') ?? '').trim(),
    gender: gender === 'men' || gender === 'women' || gender === 'unisex' ? gender : '',
    minRating: pick(params.get('rating'), RATINGS),
    maxDistanceKm: pick(params.get('distance'), DISTANCES),
    maxFromPricePoisha: pick(params.get('price'), PRICES_TAKA) * 100,
    hasOffer: params.get('offers') === '1',
    openNow: params.get('open') === '1',
    sort: sort === 'rating' || sort === 'price' ? sort : 'distance',
  }
}

interface Option {
  value: string
  label: string
}

function OptionSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
}) {
  return (
    <FormField label={label}>
      {(control) => (
        <Select {...control} value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      )}
    </FormField>
  )
}

function SearchForm({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const { t } = useTranslation('shops')
  const [query, setQuery] = useState(initial)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch(query.trim())
  }

  return (
    <form className={styles.search} role="search" onSubmit={handleSubmit}>
      <FormField label={t('search.label')}>
        {(control) => (
          <Input
            {...control}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('search.placeholder')}
          />
        )}
      </FormField>
      <Button type="submit">{t('search.button')}</Button>
    </form>
  )
}

function ShopResultCard({ shop }: { shop: ShopResult }) {
  const { t, i18n } = useTranslation('shops')
  const locale = localeFor(i18n.language)
  const oneDecimal = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  const taka = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
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
              <span className={styles.rating} role="img" aria-label={t('card.ratingLabel', { rating })}>
                {'\u2605 '}
                {rating}
              </span>{' '}
              ({t('card.reviews', { count: shop.review_count })})
            </>
          ) : (
            t('card.noReviews')
          )}
          {' \u00B7 '}
          {t('card.distance', { km: oneDecimal.format(shop.distance_km) })}
        </p>
        {shop.from_price_poisha !== null && (
          <p className={styles.meta}>
            {t('card.from', { amount: taka.format(shop.from_price_poisha / 100) })}
          </p>
        )}
        {(shop.is_open_now || shop.has_offer) && (
          <div className={styles.tags}>
            {shop.is_open_now && <Badge variant="success">{t('card.openNow')}</Badge>}
            {shop.has_offer && <Badge variant="primary">{t('card.offer')}</Badge>}
          </div>
        )}
      </Card>
    </li>
  )
}

// Remounted (through its key) whenever the address changes, so every new
// search starts in the loading state.
function Results({ filters }: { filters: ShopFilters }) {
  const { t } = useTranslation('shops')
  const load = useCallback(() => searchShops(filters), [filters])
  const { state, retry } = useAsync(load)

  if (state.status === 'loading') {
    return (
      <div className={styles.grid} aria-busy="true">
        <span className={styles.visuallyHidden} role="status">
          {t('common:states.loading')}
        </span>
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} height="8rem" />
        ))}
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <EmptyState
        title={t('results.errorTitle')}
        description={t('results.errorDescription')}
        action={
          <Button variant="secondary" onClick={retry}>
            {t('common:actions.retry')}
          </Button>
        }
      />
    )
  }

  if (state.data.length === 0) {
    return (
      <EmptyState title={t('results.emptyTitle')} description={t('results.emptyDescription')} />
    )
  }

  return (
    <>
      <p className={styles.count} aria-live="polite">
        {t('results.count', { count: state.data.length })}
      </p>
      <ul className={styles.grid}>
        {state.data.map((shop) => (
          <ShopResultCard key={shop.id} shop={shop} />
        ))}
      </ul>
    </>
  )
}

export default function ShopsPage() {
  const { t, i18n } = useTranslation('shops')
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const paramsKey = searchParams.toString()
  const filters = useMemo(() => readFilters(new URLSearchParams(paramsKey)), [paramsKey])

  const locale = localeFor(i18n.language)
  const number = new Intl.NumberFormat(locale)

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setSearchParams(next, { replace: true })
  }

  // Clears every filter but keeps the search text.
  function clearFilters() {
    const next = new URLSearchParams()
    if (filters.q) next.set('q', filters.q)
    setSearchParams(next, { replace: true })
  }

  const activeCount = [
    filters.gender,
    filters.minRating,
    filters.maxDistanceKm,
    filters.maxFromPricePoisha,
    filters.hasOffer,
    filters.openNow,
  ].filter(Boolean).length

  const genderOptions: Option[] = [
    { value: '', label: t('filters.gender.any') },
    ...GENDERS.map((gender) => ({ value: gender, label: t(`gender.${gender}`) })),
  ]
  const ratingOptions: Option[] = [
    { value: '', label: t('filters.rating.any') },
    ...RATINGS.map((rating) => ({
      value: String(rating),
      label: t('filters.rating.value', { rating: number.format(rating) }),
    })),
  ]
  const distanceOptions: Option[] = [
    { value: '', label: t('filters.distance.any') },
    ...DISTANCES.map((km) => ({
      value: String(km),
      label: t('filters.distance.value', { km: number.format(km) }),
    })),
  ]
  const priceOptions: Option[] = [
    { value: '', label: t('filters.price.any') },
    ...PRICES_TAKA.map((taka) => ({
      value: String(taka),
      label: t('filters.price.value', { amount: number.format(taka) }),
    })),
  ]
  const sortOptions: Option[] = [
    { value: 'distance', label: t('filters.sort.distance') },
    { value: 'rating', label: t('filters.sort.rating') },
    { value: 'price', label: t('filters.sort.price') },
  ]

  return (
    <div>
      <section className={styles.header} aria-labelledby="shops-title">
        <div className={styles.container}>
          <h1 id="shops-title" className={styles.title}>
            {t('title')}
          </h1>
          <p className={styles.subtitle}>{t('subtitle')}</p>
          <SearchForm
            key={filters.q}
            initial={filters.q}
            onSearch={(q) => update({ q: q || null })}
          />
        </div>
      </section>

      <div className={`${styles.container} ${styles.layout}`}>
        <aside className={styles.sidebar} aria-label={t('filters.title')}>
          <div className={styles.toggle}>
            <Button
              variant="secondary"
              fullWidth
              aria-expanded={filtersOpen}
              aria-controls="shop-filters"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              {filtersOpen ? t('filters.hide') : t('filters.show')}
              {activeCount > 0 && (
                <>
                  {' '}
                  <Badge variant="primary">{number.format(activeCount)}</Badge>
                </>
              )}
            </Button>
          </div>

          <div
            id="shop-filters"
            className={filtersOpen ? `${styles.panel} ${styles.panelOpen}` : styles.panel}
          >
            <h2 className={styles.panelTitle}>{t('filters.title')}</h2>
            <div className={styles.fields}>
              <OptionSelect
                label={t('filters.gender.label')}
                value={filters.gender}
                options={genderOptions}
                onChange={(value) => update({ gender: value || null })}
              />
              <OptionSelect
                label={t('filters.rating.label')}
                value={filters.minRating ? String(filters.minRating) : ''}
                options={ratingOptions}
                onChange={(value) => update({ rating: value || null })}
              />
              <OptionSelect
                label={t('filters.distance.label')}
                value={filters.maxDistanceKm ? String(filters.maxDistanceKm) : ''}
                options={distanceOptions}
                onChange={(value) => update({ distance: value || null })}
              />
              <OptionSelect
                label={t('filters.price.label')}
                value={filters.maxFromPricePoisha ? String(filters.maxFromPricePoisha / 100) : ''}
                options={priceOptions}
                onChange={(value) => update({ price: value || null })}
              />
              <OptionSelect
                label={t('filters.sort.label')}
                value={filters.sort}
                options={sortOptions}
                onChange={(value) => update({ sort: value === 'distance' ? null : value })}
              />
              <Checkbox
                label={t('filters.offers')}
                checked={filters.hasOffer}
                onChange={(event) => update({ offers: event.target.checked ? '1' : null })}
              />
              <Checkbox
                label={t('filters.open')}
                checked={filters.openNow}
                onChange={(event) => update({ open: event.target.checked ? '1' : null })}
              />
            </div>
            <div className={styles.panelFooter}>
              <Button variant="ghost" onClick={clearFilters} disabled={activeCount === 0}>
                {t('filters.clear')}
              </Button>
            </div>
          </div>
        </aside>

        <section className={styles.results} aria-labelledby="results-title">
          <h2 id="results-title" className={styles.visuallyHidden}>
            {t('results.heading')}
          </h2>
          <Results key={paramsKey} filters={filters} />
        </section>
      </div>
    </div>
  )
}