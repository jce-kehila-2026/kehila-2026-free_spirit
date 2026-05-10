"use client";

import { useState } from "react";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "@/firebase/firebase";
import styles from "./Login.module.css";

export default function Login() {
  const navigate = useNavigate();

  // Holds the current email and password values.
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });

  // Holds validation messages for the form fields.
  const [errors, setErrors] = useState({});

  // Holds Firebase authentication error messages.
  const [authError, setAuthError] = useState("");

  // Holds the loading state while Firebase processes the login request.
  const [isLoading, setIsLoading] = useState(false);

  // Converts Firebase error codes into user-friendly messages.
  const getFirebaseErrorMessage = (error) => {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "Invalid email or password.";
      case "auth/user-not-found":
        return "User not found.";
      case "auth/popup-closed-by-user":
        return "Google sign-in was closed before completion.";
      default:
        return error.message || "Login failed. Please try again.";
    }
  };

  // Updates the matching field when the user types.
  const handleChange = (event) => {
    const { name, value } = event.target;

    setCredentials((currentCredentials) => ({
      ...currentCredentials,
      [name]: value,
    }));
  };

  // Validates required fields before submitting the form.
  const validateForm = () => {
    const nextErrors = {};

    if (!credentials.email.trim()) {
      nextErrors.email = "Email is required";
    }

    if (!credentials.password.trim()) {
      nextErrors.password = "Password is required";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  // Handles the form submit action.
  const handleSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password,
      );
      navigate("/dashboard");
    } catch (error) {
      setAuthError(getFirebaseErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Handles Google popup authentication.
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();

    setAuthError("");

    try {
      setIsLoading(true);
      await signInWithPopup(auth, provider);
      navigate("/dashboard");
    } catch (error) {
      setAuthError(getFirebaseErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.header}>
          <h1 className={styles.title}>Login</h1>
          <p className={styles.subtitle}>Welcome back. Please sign in.</p>
        </div>

        {/* Email input field */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <input
            className={styles.input}
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            value={credentials.email}
            onChange={handleChange}
          />
          {errors.email && <p className={styles.error}>{errors.email}</p>}
        </div>

        {/* Password input field */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <input
            className={styles.input}
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={credentials.password}
            onChange={handleChange}
          />
          {errors.password && <p className={styles.error}>{errors.password}</p>}
        </div>

        {authError && <p className={styles.authError}>{authError}</p>}

        <button className={styles.button} type="submit">
          {isLoading ? "Signing In..." : "Sign In"}
        </button>

        {/* Separates email login from Google login. */}
        <div className={styles.divider}>
          <span className={styles.dividerLine}></span>
          <span className={styles.dividerText}>OR</span>
          <span className={styles.dividerLine}></span>
        </div>

        <button
          className={styles.googleButton}
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          Sign in with Google
        </button>
      </form>
    </main>
  );
}
