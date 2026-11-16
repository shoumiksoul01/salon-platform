import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { icon, latLngBounds } from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { ShopResult } from '../../api/shops'
import styles from './ShopsMap.module.css'

// Central Dhaka, used until the pins move the view.
const DEFAULT_CENTER: [number, number] = [23.8103, 90.4125]

// Same fix as components/MapPicker.tsx: Leaflet's default pin images do not
// load through Vite, so we point to them ourselves.
const pinIcon = icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// Moves the map so every result pin is visible.
function FitToShops({ shops }: { shops: ShopResult[] }) {
  const map = useMap()

  useEffect(() => {
    if (shops.length === 0) return
    if (shops.length === 1) {
      map.setView([shops[0].latitude, shops[0].longitude], 15)
      return
    }
    const bounds = latLngBounds(
      shops.map((shop) => [shop.latitude, shop.longitude] as [number, number]),
    )
    map.fitBounds(bounds, { padding: [32, 32] })
  }, [map, shops])

  return null
}

export default function ShopsMap({ shops }: { shops: ShopResult[] }) {
  const { t, i18n } = useTranslation('shops')
  const locale = i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB'
  const oneDecimal = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

  return (
    <div className={styles.wrap} role="group" aria-label={t('map.label')}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={12}
        scrollWheelZoom={false}
        className={styles.map}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToShops shops={shops} />
        {shops.map((shop) => (
          <Marker
            key={shop.id}
            position={[shop.latitude, shop.longitude]}
            icon={pinIcon}
            title={shop.name}
          >
            <Popup>
              <Link className={styles.popupTitle} to={`/shops/${shop.id}`}>
                {shop.name}
              </Link>
              <p className={styles.popupMeta}>
                {shop.area}, {shop.city}
              </p>
              <p className={styles.popupMeta}>
                {shop.review_count > 0
                  ? `\u2605 ${oneDecimal.format(shop.rating_average)} (${t('card.reviews', { count: shop.review_count })})`
                  : t('card.noReviews')}
                {' \u00B7 '}
                {t('card.distance', { km: oneDecimal.format(shop.distance_km) })}
              </p>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}