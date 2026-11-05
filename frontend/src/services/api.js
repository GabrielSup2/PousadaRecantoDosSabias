import axios from 'axios'


const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})


api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})


api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ───  autenticação ─────────────────────────────────────────────────


export const register = (data) => api.post('/auth/register', data)


export const login = (email, password) => {
  const form = new URLSearchParams()
  form.append('username', email)  // O back-end espera "username" mesmo sendo email
  form.append('password', password)
  return api.post('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}


export const getMe = () => api.get('/auth/me')

export const getUsers = () => api.get('/users')


export const getUser = (id) => api.get(`/users/${id}`)


export const updateUser = (id, data) => api.put(`/users/${id}`, data)


export const deleteUser = (id) => api.delete(`/users/${id}`)

export default api