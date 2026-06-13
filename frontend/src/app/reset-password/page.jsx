import { Suspense } from "react";

import ResetPassword from "@/components/ResetPassword/ResetPassword";

function ResetPasswordLoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <p className="text-sm font-semibold text-slate-600" role="status">
        Loading password reset...
      </p>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoadingState />}>
      <ResetPassword />
    </Suspense>
  );
}
