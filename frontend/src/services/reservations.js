import api from './api'
import { request } from './http'

const fromApi = (reservation) => ({
  id: reservation.id,
  roomId: reservation.room_id,
  guestName: reservation.guest_name,
  phone: reservation.guest_phone ?? '',
  guests: reservation.guests,
  checkIn: reservation.check_in,
  checkOut: reservation.check_out,
  status: reservation.status || 'confirmed',
  total: reservation.total_price ?? null,
  ownerId: reservation.user_id ?? null,
})

const digits = (value) => String(value || '').replace(/\D/g, '')

const toApi = (form, roomId) => ({
  room_id: roomId || form.roomId,
  guest_name: form.guestName.trim(),
  guest_phone: digits(form.phone) || null,
  guests: Number(form.guests),
  check_in: form.checkIn,
  check_out: form.checkOut,
})

export async function listReservations(roomId) {
  const params = roomId ? { room_id: roomId } : undefined
  const data = await request(api.get('/reservations', { params }))
  return data.map(fromApi)
}

export function listRoomReservations(roomId) {
  return listReservations(roomId)
}

export async function createReservation(form, roomId) {
  return fromApi(await request(api.post('/reservations', toApi(form, roomId))))
}

export async function updateReservation(id, form, roomId) {
  return fromApi(
    await request(api.put(`/reservations/${id}`, toApi(form, roomId)))
  )
}

export async function cancelReservation(id) {
  return fromApi(await request(api.put(`/reservations/${id}/cancel`)))
}

export function deleteReservation(id) {
  return request(api.delete(`/reservations/${id}`))
}

export const STATUS_LABEL = {
  confirmed: 'Confirmada',
  pending: 'Pendente',
  cancelled: 'Cancelada',
  canceled: 'Cancelada',
}

export const isCanceled = (reservation) =>
  ['cancelled', 'canceled'].includes(
    String(reservation.status).toLowerCase()
  )

export const statusKey = (reservation) => {
  const status = String(reservation.status).toLowerCase()
  return status === 'canceled' ? 'cancelled' : status
}

export const FORM_FIELD = {
  room_id: 'room',
  guest_name: 'guestName',
  guest_phone: 'phone',
  guests: 'guests',
  check_in: 'checkIn',
  check_out: 'checkOut',
}

export const detailText = (data) =>
  typeof data?.detail === 'string' ? data.detail : ''
