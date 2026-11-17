import api from './api'


export const getUsers = () => api.get('/users')


export const getUser = (id) => api.get(`/users/${id}`)


export const updateUser = (id, data) => api.put(`/users/${id}`, data)


export const deleteUser = (id) => api.delete(`/users/${id}`)


export async function getMe() {
  const { data } = await api.get('/auth/me')
  return {
    id: data.id,
    name: data.full_name ?? '',
    full_name: data.full_name ?? '',
    email: data.email,
    role: data.role,
  }
}