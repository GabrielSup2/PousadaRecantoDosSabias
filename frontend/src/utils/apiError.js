export function apiErrorMessage(error, fallback = 'Algo deu errado. Tente novamente.') {
  if (error?.code === 'ERR_NETWORK' || (!error?.response && error?.request)) {
    return 'Não foi possível conectar ao servidor. Tente de novo.'
  }

  const detail = error?.response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0]
    if (typeof first?.msg === 'string' && first.msg.trim()) return first.msg
  }

  return fallback
}
