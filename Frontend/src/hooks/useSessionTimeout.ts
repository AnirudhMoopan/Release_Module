import { useEffect } from 'react';

/**
 * Session timeout hook — disabled in demo/portfolio mode.
 * No authentication required, so no timeout needed.
 */
export function useSessionTimeout() {
  // Demo mode: ensure demo session is always active
  useEffect(() => {
    if (!sessionStorage.getItem('isLoggedIn')) {
      sessionStorage.setItem('isLoggedIn', 'true');
      sessionStorage.setItem('empCode', '100001');
      sessionStorage.setItem('empName', 'Demo User');
      sessionStorage.setItem('stepOrder', '0');
      sessionStorage.setItem('roleStatus', 'Developer');
    }
  }, []);
}

