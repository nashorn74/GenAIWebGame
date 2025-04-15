// src/admin/auth.ts
export function isAdminAuthenticated(): boolean {
    return localStorage.getItem('isAdminLoggedIn') === 'true'
  }
  
  export function setAdminAuthenticated(value: boolean) {
    if (value) {
      localStorage.setItem('isAdminLoggedIn', 'true')
    } else {
      localStorage.removeItem('isAdminLoggedIn')
    }
  }
  