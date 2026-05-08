// Route guard disabled for demo/portfolio mode

/**
 * Route guard — In demo mode, all routes are publicly accessible.
 * No authentication required.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Demo mode: always allow access
  return <>{children}</>;
}
