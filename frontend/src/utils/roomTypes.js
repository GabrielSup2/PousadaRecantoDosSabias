export const ROOM_TYPE_ORDER = ['standard', 'familia', 'suite']

export const ROOM_TYPES = {
  standard: {
    label: 'Standard',
    description: 'Cama de casal, ar-condicionado, TV e banheiro privativo.',
    size: '18 m²',
  },
  familia: {
    label: 'Família',
    description: 'Uma cama de casal e duas de solteiro, com varanda e frigobar.',
    size: '28 m²',
  },
  suite: {
    label: 'Suíte',
    description: 'Cama king, banheira, varanda com rede e vista para o jardim.',
    size: '35 m²',
  },
}

export function roomTypeKey(room) {
  const name = String(room?.name || '').toLowerCase()
  if (name.includes('suíte') || name.includes('suite')) return 'suite'
  if (Number(room?.capacity) >= 3) return 'familia'
  return 'standard'
}
