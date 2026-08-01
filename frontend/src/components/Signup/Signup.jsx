"use client";

import { useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
  signInWithPopup,
} from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase/firebase";
import {
  ACCESS_DENIED_PATH,
  claimClientInviteForUser,
  getInviteTokenFromCurrentUrl,
  getPostLoginRedirect,
  validateClientInviteToken,
} from "@/firebase/authRoleService";
import {
  getPasswordRequirementResults,
  isPasswordValid,
} from "@/utils/passwordValidation";
import { IconGoogleLogo, IconCheckSmall, IconDot } from "@/components/ui/Icons";

function RequirementStatusIcon({ isMet }) {
  return isMet ? <IconCheckSmall /> : <IconDot />;
}

export default function Signup() {
  const router = useRouter();
  const isRegistrationInFlightRef = useRef(false);
  const [hasCheckedInviteToken, setHasCheckedInviteToken] = useState(false);

  // Holds the controlled form values that are submitted to Firebase and Firestore.
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Separates field-level validation from Firebase/Firestore process errors.
  const [errors, setErrors] = useState({});
  const [signupError, setSignupError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  const passwordRequirementResults = getPasswordRequirementResults(
    formData.password,
  );

  useEffect(() => {
    const inviteToken = getInviteTokenFromCurrentUrl();

    // Public account creation remains disabled; only explicit invitation links may render this form.
    if (!inviteToken) {
      router.replace("/login");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHasCheckedInviteToken(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        return;
      }

      if (isRegistrationInFlightRef.current) {
        return;
      }

      await user.reload();
      const refreshedUser = auth.currentUser || user;

      // A signed-in user refreshing /signup should leave the auth surface and
      // land wherever their Firestore account role allows.
      router.replace(await getPostLoginRedirect(refreshedUser));
    });

    return unsubscribe;
  }, [router]);

  // Converts Firebase and custom registration errors into user-facing messages.
  const getFirebaseErrorMessage = (error) => {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password must meet all requirements.";
      default:
        return error.message || "Signup failed. Please try again.";
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.email.trim()) {
      nextErrors.email = "Email is required";
    }

    if (!formData.password) {
      nextErrors.password = "Password is required";
    } else if (!isPasswordValid(formData.password)) {
      nextErrors.password = "Password must meet all requirements.";
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSignupError("");

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      isRegistrationInFlightRef.current = true;

      const inviteToken = getInviteTokenFromCurrentUrl();

      if (inviteToken) {
        // Validate the token before Firebase Auth user creation so expired
        // onboarding links cannot create orphaned accounts.
        await validateClientInviteToken(inviteToken);
      }

      // First create the Firebase Auth user, then persist app-specific profile data.
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password,
      );

      try {
        await sendEmailVerification(auth.currentUser || userCredential.user);
      } catch (verificationError) {
        console.error("Failed to send verification email:", verificationError);
      }

      if (inviteToken) {
        await claimClientInviteForUser(userCredential.user, inviteToken);
        router.push(await getPostLoginRedirect(userCredential.user));
        return;
      }

      // New manager accounts land on the routed programs workspace; creation stays inside its modal UI.
      router.push("/programs");
    } catch (error) {
      setSignupError(getFirebaseErrorMessage(error));
    } finally {
      isRegistrationInFlightRef.current = false;
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    const provider = new GoogleAuthProvider();

    setSignupError("");

    try {
      setIsLoading(true);
      isRegistrationInFlightRef.current = true;

      const inviteToken = getInviteTokenFromCurrentUrl();

      if (inviteToken) {
        // Google sign-in can create an auth user, so validate invite freshness
        // before opening the provider flow whenever an invite is present.
        await validateClientInviteToken(inviteToken);
      }

      const result = await signInWithPopup(auth, provider);

      if (inviteToken) {
        await claimClientInviteForUser(result.user, inviteToken);
        const redirectPath = await getPostLoginRedirect(result.user);
        if (redirectPath === ACCESS_DENIED_PATH) {
          await signOut(auth);
        }
        router.push(redirectPath);
        return;
      }

      // Google-created manager accounts use the routed programs workspace, not the private modal component.
      router.push("/programs");
    } catch (error) {
      setSignupError(getFirebaseErrorMessage(error));
    } finally {
      isRegistrationInFlightRef.current = false;
      setIsLoading(false);
    }
  };

  if (!hasCheckedInviteToken) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(205,224,201,0.82),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(185,217,210,0.62),transparent_34%),linear-gradient(135deg,#F7FAF5_0%,#EEF5F7_100%)] px-6 py-8">
      <form
        className="w-full max-w-[440px] rounded-[1.75rem] border border-white/80 bg-[#FFFDF8] p-8 shadow-[0_24px_60px_rgba(36,92,102,0.14)]"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="mb-7 text-center">
          <h1 className="text-3xl font-bold leading-tight tracking-[-0.03em] text-[#15383E]">
            Sign Up
          </h1>
          <p className="mt-2 text-[15px] text-[#5C7478]">
            Create an account to manage programs.
          </p>
        </div>

        <div className="mb-[18px]">
          <label className="mb-2 block text-sm font-semibold text-[#31585F]" htmlFor="email">
            Email
          </label>
          <input
            className="w-full rounded-2xl border border-[#D7E3D5] bg-white px-3.5 py-3 text-[15px] text-[#173A40] outline-none transition focus:border-[#6BB2A0] focus:shadow-[0_0_0_4px_rgba(107,178,160,0.18)]"
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            value={formData.email}
            onChange={handleChange}
          />
          {errors.email && (
            <p className="mt-1.5 text-[13px] text-red-600">{errors.email}</p>
          )}
        </div>

        <div className="mb-[18px]">
          <label className="mb-2 block text-sm font-semibold text-[#31585F]" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              aria-describedby="password-requirements"
              autoComplete="new-password"
              className="w-full rounded-2xl border border-[#D7E3D5] bg-white py-3 pl-3.5 pr-20 text-[15px] text-[#173A40] outline-none transition focus:border-[#6BB2A0] focus:shadow-[0_0_0_4px_rgba(107,178,160,0.18)]"
              id="password"
              name="password"
              type={isPasswordVisible ? "text" : "password"}
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
            />
            <button
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-3 my-auto h-fit rounded px-1.5 py-1 text-xs font-bold text-[#2C6975] transition hover:text-[#173A40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0] focus-visible:ring-offset-1"
              type="button"
              onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
            >
              {isPasswordVisible ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-[13px] text-red-600" role="alert">
              {errors.password}
            </p>
          )}
          <ul
            className="mt-3 grid gap-1.5 text-xs"
            id="password-requirements"
            aria-label="Password requirements"
            aria-live="polite"
          >
            {passwordRequirementResults.map((requirement) => (
              <li
                className={`flex items-center gap-2 font-medium ${
                  requirement.isMet ? "text-emerald-700" : "text-slate-500"
                }`}
                key={requirement.id}
              >
                <RequirementStatusIcon isMet={requirement.isMet} />
                <span>{requirement.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-[18px]">
          <label
            className="mb-2 block text-sm font-semibold text-[#31585F]"
            htmlFor="confirmPassword"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              autoComplete="new-password"
              className="w-full rounded-2xl border border-[#D7E3D5] bg-white py-3 pl-3.5 pr-20 text-[15px] text-[#173A40] outline-none transition focus:border-[#6BB2A0] focus:shadow-[0_0_0_4px_rgba(107,178,160,0.18)]"
              id="confirmPassword"
              name="confirmPassword"
              type={isConfirmPasswordVisible ? "text" : "password"}
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            <button
              aria-label={
                isConfirmPasswordVisible
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
              className="absolute inset-y-0 right-3 my-auto h-fit rounded px-1.5 py-1 text-xs font-bold text-[#2C6975] transition hover:text-[#173A40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0] focus-visible:ring-offset-1"
              type="button"
              onClick={() =>
                setIsConfirmPasswordVisible((isVisible) => !isVisible)
              }
            >
              {isConfirmPasswordVisible ? "Hide" : "Show"}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1.5 text-[13px] text-red-600" role="alert">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {signupError && (
          <p className="mb-4 text-center text-sm font-semibold text-red-600">
            {signupError}
          </p>
        )}

        <button
          className="mt-2 w-full rounded-full bg-[#245C66] px-4 py-3 text-base font-bold text-white transition hover:-translate-y-px hover:bg-[#173A40] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Creating account..." : "Create Account"}
        </button>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200"></span>
          <span className="text-xs font-bold text-slate-500">OR</span>
          <span className="h-px flex-1 bg-slate-200"></span>
        </div>

        <button
          className="flex w-full items-center justify-center gap-2.5 rounded-full border border-[#D7E3D5] bg-white px-4 py-3 text-[15px] font-bold text-[#31585F] transition hover:-translate-y-px hover:border-[#B9CFCA] hover:bg-[#EEF4EC] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          type="button"
          onClick={handleGoogleSignup}
          disabled={isLoading}
        >
          <IconGoogleLogo />
          <span>Sign up with Google</span>
        </button>

        <p className="mt-5 text-center text-sm font-medium text-slate-600">
          Already have an account?{" "}
          <Link className="font-bold text-[#2C6975] hover:text-[#173A40]" href="/">
            Login
          </Link>
        </p>
      </form>
    </main>
  );
}
