import { useEffect, useRef } from 'react'
import { icon } from 'leaflet'
import type { Marker as LeafletMarker } from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import styles from './MapPicker.module.css'

export interface MapPoint {
  lat: number
  lng: number
}

interface MapPickerProps {
  value: MapPoint | null
  onChange: (point: MapPoint) => void
  /** Screen-reader name of the map. Pass a translated string. */
  label: string
  disabled?: boolean
  /** Raise this number to move the map to the current pin (for example after "Use my location"). */
  focusKey?: number
}

// Dhaka. Used until the owner places a pin.
const DEFAULT_CENTER: [number, number] = [23.8103, 90.4125]

// Leaflet's default pin images do not load through Vite, so we point to them ourselves.
const pinIcon = icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function ClickToPlace({ onPick }: { onPick: (point: MapPoint) => void }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })
  return null
}

function FocusOnPin({ point, token }: { point: MapPoint | null; token: number }) {
  const map = useMap()
  const pointRef = useRef(point)

  useEffect(() => {
    pointRef.current = point
  })

  useEffect(() => {
    const current = pointRef.current
    if (token > 0 && current) map.setView([current.lat, current.lng], 16)
  }, [map, token])

  return null
}

export default function MapPicker({ value, onChange, label, disabled = false, focusKey = 0 }: MapPickerProps) {
  const center: [number, number] = value ? [value.lat, value.lng] : DEFAULT_CENTER

  return (
    <div className={styles.wrap} role="group" aria-label={label}>
      <MapContainer center={center} zoom={value ? 16 : 12} scrollWheelZoom={false} className={styles.map}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {!disabled && <ClickToPlace onPick={onChange} />}
        <FocusOnPin point={value} token={focusKey} />
        {value && (
          <Marker
            position={[value.lat, value.lng]}
            icon={pinIcon}
            draggable={!disabled}
            eventHandlers={{
              dragend(event) {
                const position = (event.target as LeafletMarker).getLatLng()
                onChange({ lat: position.lat, lng: position.lng })
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}
