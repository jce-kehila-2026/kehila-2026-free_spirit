"use client";

import { doc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { useState } from "react";
import { useNavigation } from "@/components/NavigationProvider/NavigationContext";
import { db } from "@/firebase/firebase";

const roleOptions = ["User", "Program Manager", "Admin"];

export default function AdminPermissionsPage() {
  const { links, isLoadingLinks, linksError, setLinks } = useNavigation();
  const [updatingLinkId, setUpdatingLinkId] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handlePermissionChange = async (link, role, isAllowed) => {
    const currentRoles = Array.isArray(link.allowedRoles)
      ? link.allowedRoles
      : [];
    const nextRoles = isAllowed
      ? [...new Set([...currentRoles, role])]
      : currentRoles.filter((allowedRole) => allowedRole !== role);

    setUpdatingLinkId(link.id);
    setError("");
    setSuccessMessage("");

    try {
      await updateDoc(doc(db, "navigation_links", link.id), {
        allowedRoles: nextRoles,
      });

      setLinks((currentLinks) =>
        currentLinks.map((currentLink) =>
          currentLink.id === link.id
            ? { ...currentLink, allowedRoles: nextRoles }
            : currentLink,
        ),
      );
      setSuccessMessage(`Permissions updated for ${link.label || link.href}.`);
    } catch (updateError) {
      setError(
        updateError.message || "Failed to update navigation permissions.",
      );
    } finally {
      setUpdatingLinkId("");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <section className="mx-auto w-full max-w-6xl">
        <Link
          className="text-sm font-bold text-blue-700 hover:text-blue-900"
          href="/admin"
        >
          &larr; Back to Dashboard
        </Link>

        <div className="mb-6 mt-5">
          <h1 className="text-3xl font-bold text-slate-950">
            Navigation Permissions
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Choose which account roles can see each dynamic navigation link.
          </p>
        </div>

        {(error || linksError) && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error || linksError}
          </p>
        )}

        {successMessage && (
          <p
            className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700"
            role="status"
          >
            {successMessage}
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Navigation Link</th>
                <th className="px-4 py-3">Path</th>
                {roleOptions.map((role) => (
                  <th className="px-4 py-3 text-center" key={role}>
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoadingLinks ? (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-slate-500"
                    colSpan={roleOptions.length + 2}
                  >
                    Loading navigation permissions...
                  </td>
                </tr>
              ) : links.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-6 text-center text-slate-500"
                    colSpan={roleOptions.length + 2}
                  >
                    No navigation links found.
                  </td>
                </tr>
              ) : (
                links.map((link) => {
                  const allowedRoles = Array.isArray(link.allowedRoles)
                    ? link.allowedRoles
                    : [];

                  return (
                    <tr className="text-slate-700" key={link.id}>
                      <td className="px-4 py-3 font-semibold">
                        {link.label || "Untitled link"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {link.href || "No path"}
                      </td>
                      {roleOptions.map((role) => (
                        <td className="px-4 py-3 text-center" key={role}>
                          <input
                            aria-label={`${role} access to ${link.label || link.href}`}
                            checked={allowedRoles.includes(role)}
                            className="h-5 w-5 cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={updatingLinkId === link.id}
                            onChange={(event) =>
                              handlePermissionChange(
                                link,
                                role,
                                event.target.checked,
                              )
                            }
                            type="checkbox"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
