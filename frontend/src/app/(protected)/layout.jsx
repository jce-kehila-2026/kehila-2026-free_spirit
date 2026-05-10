import ProtectedRoute from "@/components/ProtectedRoute/ProtectedRoute";

// Any route placed under app/(protected) inherits this auth guard.
// The route group name is not part of the public URL.
export default function ProtectedLayout({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
