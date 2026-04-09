const ADMIN_AUTH_KEY = 'arkacia_admin_authenticated'

export function isAdminAuthenticated(): boolean {
  return localStorage.getItem(ADMIN_AUTH_KEY) === 'true'
}

export function setAdminAuthenticated(value: boolean) {
  if (value) {
    localStorage.setItem(ADMIN_AUTH_KEY, 'true')
    return
  }
  localStorage.removeItem(ADMIN_AUTH_KEY)
}
  
