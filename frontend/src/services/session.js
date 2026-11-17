import useAuthStore from '../store/authStore'

export const getCurrentUser = () => useAuthStore.getState().user

export const isAdmin = () => getCurrentUser()?.role === 'admin'

export const getUserId = () => getCurrentUser()?.id ?? null
