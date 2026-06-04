"use client";

import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/firebase/firebase";

const roleOptions = ["User", "Program Manager", "Admin"];

const formatCreatedAt = (createdAt) => {
  if (!createdAt?.toDate) {
    return "Unknown";
  }

  return createdAt.toDate().toLocaleString();
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState("");

  useEffect(() => {
    let shouldIgnore = false;

    const fetchUsers = async () => {
      try {
        const accountsSnapshot = await getDocs(collection(db, "accounts"));
        const nextUsers = accountsSnapshot.docs.map((accountDoc) => ({
          id: accountDoc.id,
          ...accountDoc.data(),
        }));

        if (!shouldIgnore) {
          setUsers(nextUsers);
          setError("");
        }
      } catch (fetchError) {
        if (!shouldIgnore) {
          setError(fetchError.message || "Failed to load users.");
        }
      } finally {
        if (!shouldIgnore) {
          setIsLoading(false);
        }
      }
    };

    fetchUsers();

    return () => {
      shouldIgnore = true;
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage("");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  const handleRoleChange = async (userId, nextRole) => {
    setUpdatingUserId(userId);
    setError("");
    setToastMessage("");

    try {
      await updateDoc(doc(db, "accounts", userId), {
        role: nextRole,
      });

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId ? { ...user, role: nextRole } : user,
        ),
      );
      setToastMessage("User role updated successfully.");
    } catch (updateError) {
      setError(updateError.message || "Failed to update user role.");
    } finally {
      setUpdatingUserId("");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      {toastMessage && (
        <div
          className="fixed left-1/2 top-24 z-[60] w-[min(92vw,420px)] -translate-x-1/2 rounded-lg border border-green-200 bg-green-50 px-5 py-4 text-center text-sm font-bold text-green-700 shadow-lg"
          role="status"
        >
          {toastMessage}
        </div>
      )}

      <section className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-950">
            Admin User Management
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Review users and update application roles.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Current Role</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Update Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan="4">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan="4">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr className="text-slate-700" key={user.id}>
                    <td className="px-4 py-3 font-semibold">
                      {user.email || "No email"}
                    </td>
                    <td className="px-4 py-3">{user.role || "User"}</td>
                    <td className="px-4 py-3">{formatCreatedAt(user.created_at)}</td>
                    <td className="px-4 py-3">
                      <select
                        className="w-full max-w-[220px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-600 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.14)] disabled:cursor-not-allowed disabled:opacity-70"
                        value={user.role || "User"}
                        onChange={(event) =>
                          handleRoleChange(user.id, event.target.value)
                        }
                        disabled={updatingUserId === user.id}
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
