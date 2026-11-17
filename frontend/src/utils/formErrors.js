export function fieldErrorsFrom422(data) {
  const errors = {}
  if (!Array.isArray(data?.detail)) return errors

  for (const item of data.detail) {
    let field = item.loc?.[item.loc.length - 1]
    if (field === 'username') field = 'email'
    if (field === 'full_name') field = 'name'
    if (field && !errors[field]) errors[field] = item.msg
  }

  return errors
}
