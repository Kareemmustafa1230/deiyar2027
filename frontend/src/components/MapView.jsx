import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents, Circle } from 'react-leaflet'
import L from 'leaflet'
import { Img, RatingPill } from './ui'
import { useLang } from '../lib/i18n'

const tiles = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

function Fit({ points }) {
  const map = useMap()
  const key = points.map((p) => p.join()).join('|')
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) map.setView(points[0], 13)
    else map.fitBounds(points, { padding: [40, 40], maxZoom: 13 })
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function BoundsWatcher({ onBounds }) {
  useMapEvents({
    moveend: (e) => {
      const b = e.target.getBounds()
      onBounds?.([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((v) => v.toFixed(4)).join(','))
    },
  })
  return null
}

/** Search map with price pins (spec §3: price shown on the pin, popup with photos & a link to the listing). */
export default function MapView({ items, active, onBounds, className = '' }) {
  const { money, n, t } = useLang()
  const points = useMemo(() => items.map((p) => [p.lat, p.lng]), [items])
  return (
    <MapContainer center={[24.7, 46.7]} zoom={6} scrollWheelZoom className={`h-full w-full ${className}`} zoomControl={false}>
      <TileLayer url={tiles} attribution="&copy; OpenStreetMap contributors" />
      <Fit points={points} />
      {onBounds && <BoundsWatcher onBounds={onBounds} />}
      {items.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          zIndexOffset={active === p.id ? 1000 : 0}
          icon={L.divIcon({ html: `<div class="price-pin ${active === p.id ? 'active' : ''}">${money(p.price)}</div>`, className: '', iconSize: [0, 0] })}
        >
          <Popup closeButton={false} minWidth={240}>
            <Link to={`/property/${p.id}`} className="block w-60 text-ink">
              <Img src={p.images?.[0]} className="h-32 w-full" />
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="line-clamp-1 font-semibold">{p.title}</span>
                  <RatingPill value={p.rating} dark />
                </div>
                <div className="mt-1 text-xs text-ink/50">{n(p.district)} · {p.area}م² · {p.rooms} {t('غرف', 'rooms')}</div>
                <div className="mt-1 font-bold">{money(p.price)} <span className="text-xs font-normal text-ink/50">/ {t('ليلة', 'night')}</span></div>
              </div>
            </Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

export function PlaceMap({ lat, lng, exact, className = '' }) {
  return (
    <MapContainer center={[lat, lng]} zoom={exact ? 15 : 13} scrollWheelZoom={false} className={className}>
      <TileLayer url={tiles} attribution="&copy; OpenStreetMap contributors" />
      {exact ? (
        <Marker position={[lat, lng]} icon={L.divIcon({ html: '<div class="price-pin active">🏠</div>', className: '', iconSize: [0, 0] })} />
      ) : (
        <Circle center={[lat, lng]} radius={900} pathOptions={{ color: '#357a9c', fillColor: '#4190b5', fillOpacity: 0.15 }} />
      )}
    </MapContainer>
  )
}

function Clicker({ onChange }) {
  useMapEvents({ click: (e) => onChange({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }) })
  return null
}

function Recenter({ value }) {
  const map = useMap()
  useEffect(() => { if (value?.lat) map.setView([value.lat, value.lng], Math.max(map.getZoom(), 11)) }, [value?.lat, value?.lng]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

/** Click-to-place picker used by the host wizard. */
export function PickMap({ value, onChange, className = '' }) {
  return (
    <MapContainer center={value?.lat ? [value.lat, value.lng] : [24.7, 46.7]} zoom={value?.lat ? 13 : 5} className={className}>
      <TileLayer url={tiles} attribution="&copy; OpenStreetMap contributors" />
      <Clicker onChange={onChange} />
      <Recenter value={value} />
      {value?.lat && <Marker position={[value.lat, value.lng]} icon={L.divIcon({ html: '<div class="price-pin active">📍</div>', className: '', iconSize: [0, 0] })} />}
    </MapContainer>
  )
}
