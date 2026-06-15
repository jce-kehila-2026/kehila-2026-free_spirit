import { Suspense } from "react";

import ResetPassword from "@/components/ResetPassword/ResetPassword";

function ResetPasswordLoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#F7FAF5_0%,#EEF5F7_100%)] px-6">
      <p className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#5C7478] shadow-sm" role="status">
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
