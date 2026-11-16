// Mock fixtures for shop photos and virtual tours (UI-SK-15).
// Pages never import this file. They call functions in src/api/.
// Photos are small SVG pictures made in code, so no network or image files are needed.

export interface ShopImage {
  id: string
  shop_id: string
  url: string
  alt_text: string
  sort_order: number
}

// tour_url is a link to an external virtual tour page. null = the shop has no tour.
export interface ShopTour {
  shop_id: string
  tour_url: string | null
}

const uid = (group: number, n: number): string =>
  `${String(group).padStart(8, '0')}-0000-4000-8000-${String(n).padStart(12, '0')}`
const SHOP = 1
const IMAGE = 7

function placeholder(label: string, hue: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">` +
    `<rect width="800" height="600" fill="hsl(${hue} 45% 82%)"/>` +
    `<text x="400" y="310" font-family="sans-serif" font-size="40" text-anchor="middle" ` +
    `fill="hsl(${hue} 35% 30%)">${label}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const gallery = (shop: number, hue: number, labels: string[]): ShopImage[] =>
  labels.map((label, index) => ({
    id: uid(IMAGE, shop * 10 + index),
    shop_id: uid(SHOP, shop),
    url: placeholder(label, hue),
    alt_text: label,
    sort_order: index,
  }))

// Shop 5 has no photos and no tour on purpose, so the empty case can be tested.
export const shopImages: ShopImage[] = [
  ...gallery(1, 340, ['Reception area', 'Facial room', 'Makeup station']),
  ...gallery(2, 210, ['Barber chairs', 'Waiting area', 'Beard care corner']),
  ...gallery(3, 150, ['Salon floor', 'Hair spa room']),
  ...gallery(4, 30, ['Classic barber chair', 'Shaving station', 'Front desk']),
  ...gallery(6, 280, ['Facial suite', 'Bridal room', 'Waxing room', 'Reception']),
]

export const shopTours: ShopTour[] = [
  { shop_id: uid(SHOP, 1), tour_url: 'https://example.com/tours/rupa-beauty-lounge' },
  { shop_id: uid(SHOP, 2), tour_url: 'https://example.com/tours/urban-cuts' },
  { shop_id: uid(SHOP, 6), tour_url: 'https://example.com/tours/glow-parlour' },
]