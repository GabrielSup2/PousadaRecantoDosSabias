export async function request(promise) {
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
