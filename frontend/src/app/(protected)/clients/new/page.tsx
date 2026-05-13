import { redirect } from "next/navigation";

/**
 * /clients/new now redirects to /clients (the hub page).
 * The hub's "+ Add New Client" button handles the creation flow.
 */
export default function NewClientRedirect() {
  redirect("/clients");
}
