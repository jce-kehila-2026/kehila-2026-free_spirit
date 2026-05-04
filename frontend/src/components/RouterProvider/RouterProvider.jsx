"use client";

import { BrowserRouter } from "react-router-dom";

export default function RouterProvider({ children }) {
  // Provides React Router context for components that use useNavigate.
  return <BrowserRouter>{children}</BrowserRouter>;
}
