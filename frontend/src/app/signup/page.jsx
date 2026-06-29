import { redirect } from "next/navigation";
import Signup from "@/components/Signup/Signup";

export default async function SignupPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const tokenParam = resolvedSearchParams?.token;
  const inviteToken = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  // Public account creation remains disabled; only explicit invitation links may render this form.
  if (!inviteToken?.trim()) {
    redirect("/login");
  }

  return <Signup />;
}
