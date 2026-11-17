export const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export const digits = (value) => String(value || '').replace(/\D/g, '')

export function formatPhone(value) {
  const number = digits(value).slice(0, 11)
  if (!number) return ''
  if (number.length <= 2) return `(${number}`
  if (number.length <= 6) return `(${number.slice(0, 2)}) ${number.slice(2)}`
  if (number.length <= 10) {
    return `(${number.slice(0, 2)}) ${number.slice(2, 6)}-${number.slice(6)}`
  }
  return `(${number.slice(0, 2)}) ${number.slice(2, 7)}-${number.slice(7)}`
}

export function formatDate(iso) {
  if (!iso) return ''
  const [year, month, day] = iso.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

export function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0

  const toUtc = (iso) => {
    const [year, month, day] = iso.split('-').map(Number)
    return Date.UTC(year, month - 1, day)
  }

  return Math.round((toUtc(checkOut) - toUtc(checkIn)) / 86400000)
}
