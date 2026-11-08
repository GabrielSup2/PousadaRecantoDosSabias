import api from './api'

async function request(promise) {
  try {
    const { data } = await promise
    return data
  } catch (error) {
    if (error.response) {
      throw { status: error.response.status, data: error.response.data }
    }
    throw { network: true }
  }
}

const fromApi = (room) => ({
  id: room.id,
  name: room.name,
  description: room.description || '',
  capacity: room.capacity,
  dailyRate: Number(room.daily_rate),
  active: room.is_active ?? true,
})

export async function listRooms(includeInactive = false) {
  const params = includeInactive ? { include_inactive: true } : undefined
  const data = await request(api.get('/rooms', { params }))
  return data.map(fromApi)
}

export async function getRoom(id) {
  return fromApi(await request(api.get(`/rooms/${id}`)))
}

import api from './api'

async function request(promise) {
  try {
    const { data } = await promise
    return data
  } catch (error) {
    if (error.response) {
      throw { status: error.response.status, data: error.response.data }
    }
    throw { network: true }
  }
}

const fromApi = (room) => ({
  id: room.id,
  name: room.name,
  description: room.description || '',
  capacity: room.capacity,
  dailyRate: Number(room.daily_rate),
  active: room.is_active ?? true,
})

const toApi = (form) => ({
  name: form.name.trim(),
  description: form.description?.trim() || null,
  capacity: Number(form.capacity),
  daily_rate: Number(form.dailyRate),
  is_active: form.active,
})

export async function listRooms(includeInactive = false) {
  const params = includeInactive ? { include_inactive: true } : undefined
  const data = await request(api.get('/rooms', { params }))
  return data.map(fromApi)
}

export async function getRoom(id) {
  return fromApi(await request(api.get(`/rooms/${id}`)))
}

export async function createRoom(form) {
  return fromApi(await request(api.post('/rooms', toApi(form))))
}

export async function updateRoom(id, form) {
  return fromApi(await request(api.put(`/rooms/${id}`, toApi(form))))
}

export const FORM_FIELD = { daily_rate: 'dailyRate', is_active: 'active' }
