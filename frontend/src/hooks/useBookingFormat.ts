import { useTranslation } from 'react-i18next'

// Dates, times and money for the booking pages, in the language of the page and in Dhaka time.
// Money is stored in poisha; the text "৳{{amount}}" comes from the customer translations.
export function useBookingFormat() {
  const { t, i18n } = useTranslation('customer')
  const locale = i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB'

  const dateFormat = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Dhaka',
  })
  const timeFormat = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Dhaka',
  })
  const takaFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })

  const date = (iso: string) => dateFormat.format(new Date(iso))
  const time = (iso: string) => timeFormat.format(new Date(iso))

  return {
    date,
    time,
    dateTime: (iso: string) => `${date(iso)} · ${time(iso)}`,
    range: (start: string, end: string) => `${date(start)} · ${time(start)} – ${time(end)}`,
    // 'YYYY-MM-DD' (a Dhaka calendar day) as a short date.
    day: (day: string) => date(`${day}T12:00:00+06:00`),
    money: (poisha: number) => t('bookings.money', { amount: takaFormat.format(poisha / 100) }),
  }
}
