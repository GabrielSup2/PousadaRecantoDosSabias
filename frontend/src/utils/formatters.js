import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const formatDate = (date, formatStr = 'dd/MM/yyyy') => {
  return format(new Date(date), formatStr, { locale: ptBR })
}

export const formatDateTime = (date) => {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export const formatTime = (date) => {
  return format(new Date(date), 'HH:mm', { locale: ptBR })
}

export const formatRelativeTime = (date) => {
  return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true })
}

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value) || 0)
}

export const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0
  const start = new Date(`${checkIn}T00:00:00`)
  const end = new Date(`${checkOut}T00:00:00`)
  const diff = Math.round((end - start) / 86_400_000)
  return Math.max(0, diff)
}

export const calculateTotal = (checkIn, checkOut, dailyRate) => {
  return calculateNights(checkIn, checkOut) * (Number(dailyRate) || 0)
}

export const getInitials = (name) => {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
