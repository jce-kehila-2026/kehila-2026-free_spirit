"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/firebase/firebase";

import { DOCUMENT_TYPE_OPTIONS, DOCUMENT_STATUS_OPTIONS, type DocumentStatus, uploadDocumentFormSchema, type UploadDocumentFormData, type ClientDocument } from "@/schema/documentSchema";
import type { ClientDoc } from "@/components/clients/list/ClientList";

// ─── Props ────────────────────────────────────────────────────────────────────

interface DocumentsTabProps {
  client: ClientDoc;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Max file size: 10 MB */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Allowed MIME types */
const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

// ─── Status badge styling ─────────────────────────────────────────────────────

const STATUS_BADGE: Record<DocumentStatus, { bg: string; text: string; border: string }> = {
  active:         { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  expired:        { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200"     },
  pending_review: { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200"   },
  rejected:       { bg: "bg-slate-100",  text: "text-slate-600",   border: "border-slate-200"   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB");
}

function fileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "📄";
  if (["jpg", "jpeg", "png", "webp", "heic"].includes(ext ?? "")) return "🖼️";
  return "📎";
}

// ─── Shared styling helpers ───────────────────────────────────────────────────

function inputCls(hasError: boolean) {
  return [
    "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 outline-none",
    "placeholder:text-slate-400 transition-colors duration-150",
    "focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
    hasError
      ? "border-red-400 bg-red-50 focus:ring-red-400"
      : "border-slate-300 bg-white hover:border-slate-400",
  ].join(" ");
}

function selectCls(hasError: boolean) {
  return [
    "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 outline-none appearance-none",
    "transition-colors duration-150",
    "focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
    hasError
      ? "border-red-400 bg-red-50 focus:ring-red-400"
      : "border-slate-300 bg-white hover:border-slate-400",
  ].join(" ");
}

// ─── FieldWrapper ─────────────────────────────────────────────────────────────

function FieldWrapper({
  label,
  htmlFor,
  error,
  required = false,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500" aria-hidden="true">*</span>
        )}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}

// ─── DocumentRow ──────────────────────────────────────────────────────────────

function DocumentRow({
  doc: document,
  onDelete,
}: {
  doc: ClientDocument;
  onDelete: () => void;
}) {
  const badge = STATUS_BADGE[document.status] ?? STATUS_BADGE.active;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
      {/* Icon */}
      <span className="text-xl" aria-hidden="true">
        {fileIcon(document.file_name)}
      </span>

      {/* Meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {document.file_name}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="text-xs text-slate-500">{humanize(document.document_type)}</span>
          {document.expiration_date && (
            <span className="text-xs text-slate-400">
              Expires: {formatDate(document.expiration_date)}
            </span>
          )}
          {document.uploaded_at && (
            <span className="text-xs text-slate-400">
              Uploaded: {formatDate(document.uploaded_at)}
            </span>
          )}
        </div>
        {document.manager_notes && (
          <p className="mt-1 truncate text-xs text-slate-400 italic">
            {document.manager_notes}
          </p>
        )}
      </div>

      {/* Status badge */}
      <span
        className={[
          "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
          badge.bg,
          badge.text,
          badge.border,
        ].join(" ")}
      >
        {humanize(document.status)}
      </span>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={document.file_url}
          target="_blank"
          rel="noopener noreferrer"
          id={`btn-doc-view-${document.file_name}`}
          className="rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
        >
          View ↗
        </a>
        <button
          type="button"
          id={`btn-doc-delete-${document.file_name}`}
          onClick={onDelete}
          className="rounded-md px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * DocumentsTab
 *
 * Tab 4 of ClientProfileDashboard.
 *
 * Top section — lists existing client_documents with status badges and
 * View / Delete actions.
 *
 * Bottom section — upload form: file picker, document_type dropdown,
 * expiration_date, manager_notes. On submit:
 *   1. Validate file (type + size).
 *   2. Upload to Firebase Storage at clients/{clientId}/documents/{fileName}.
 *   3. Get download URL.
 *   4. Append the metadata object to client_documents[] in Firestore.
 */
export default function DocumentsTab({ client }: DocumentsTabProps) {
  // Local copy of the docs list so we can optimistically update without a
  // page reload after each upload / delete.
  const [docs, setDocs] = useState<ClientDocument[]>(
    client.client_documents ?? []
  );

  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UploadDocumentFormData>({
    resolver: zodResolver(uploadDocumentFormSchema),
    mode: "onTouched",
    defaultValues: {
      document_type:   undefined,
      expiration_date: "",
      manager_notes:   "",
    },
  });

  // ── File validation ───────────────────────────────────────────────────────

  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Only PDF, JPEG, PNG, WebP, and HEIC files are accepted.";
    }
    if (file.size > MAX_FILE_BYTES) {
      return "File is too large. Maximum size is 10 MB.";
    }
    return null;
  }

  // ── Upload handler ────────────────────────────────────────────────────────

  const onSubmit = useCallback(async (formData: UploadDocumentFormData) => {
    const fileInput = document.getElementById("doc-file-input") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) {
      setFileError("Please select a file to upload.");
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    setFileError(null);
    setUploadProgress(0);
    setIsLoading(true);

    try {
      // 1. Upload to Firebase Storage
      const timestamp = Date.now();
      const storageRef = ref(
        storage!,
        `clients/${client.id}/documents/${timestamp}_${file.name}`
      );
      const uploadTask = uploadBytesResumable(storageRef, file);

      const downloadURL = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const pct = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            setUploadProgress(pct);
          },
          (error) => {
            reject(error);
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (err) {
              reject(err);
            }
          }
        );
      });

      // 2. Build the metadata record
      const newDoc: ClientDocument = {
        document_type:   formData.document_type,
        file_name:       file.name,
        file_url:        downloadURL,
        status:          "active",
        uploaded_at:     new Date().toISOString().split("T")[0],
        expiration_date: formData.expiration_date ?? "",
        manager_notes:   formData.manager_notes   ?? "",
      };

      // 3. Append to Firestore
      const updatedDocs = [...docs, newDoc];
      const firestoreRef = doc(db!, "clients", client.id);
      await updateDoc(firestoreRef, {
        client_documents: updatedDocs,
        updated_at: serverTimestamp(),
      });

      // 4. Update local state + reset form
      setDocs(updatedDocs);
      reset();
      if (fileInput) fileInput.value = "";
      toast.success(`"${file.name}" uploaded successfully.`);
    } catch (error) {
      console.error(error);
      toast.error("Upload failed. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
    }
  }, [client.id, docs, reset]);

  // ── Delete handler ────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (index: number) => {
    const updated = docs.filter((_, i) => i !== index);
    try {
      const firestoreRef = doc(db!, "clients", client.id);
      await updateDoc(firestoreRef, {
        client_documents: updated,
        updated_at: serverTimestamp(),
      });
      setDocs(updated);
      toast.success("Document removed.");
    } catch (err) {
      console.error("[DocumentsTab] Delete failed:", err);
      toast.error("Could not remove the document. Please try again.");
    }
  }, [client.id, docs]);


  // ── Render ────────────────────────────────────────────────────────────────

  const isUploading = isLoading || isSubmitting || uploadProgress !== null;

  return (
    <div className="space-y-6">

      {/* ════ Section 1: Existing documents ════ */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4 sm:px-8">
          <h2 className="text-base font-bold text-slate-800">Uploaded Documents</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {docs.length === 0
              ? "No documents on file yet."
              : `${docs.length} document${docs.length === 1 ? "" : "s"} on file.`}
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {docs.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-200 px-6 py-10 text-center">
              <p className="text-sm text-slate-400">
                Use the upload form below to add the first document.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((d, i) => (
                <DocumentRow
                  key={`${d.file_name}-${i}`}
                  doc={d}
                  onDelete={() => handleDelete(i)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════ Section 2: Upload form ════ */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4 sm:px-8">
            <h2 className="text-base font-bold text-slate-800">Upload New Document</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              PDF, JPEG, PNG, WebP, or HEIC · Max 10 MB
            </p>
          </div>

          <div className="space-y-5 p-6 sm:p-8">
            {/* File picker */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="doc-file-input"
                className="text-sm font-semibold text-slate-700"
              >
                File{" "}
                <span className="ml-1 text-red-500" aria-hidden="true">*</span>
              </label>

              {/* Drop-zone styled label */}
              <label
                htmlFor="doc-file-input"
                className={[
                  "flex cursor-pointer flex-col items-center justify-center gap-2",
                  "rounded-xl border-2 border-dashed px-6 py-8 text-center",
                  "transition-colors",
                  fileError
                    ? "border-red-300 bg-red-50"
                    : "border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/30",
                ].join(" ")}
              >
                <span className="text-2xl" aria-hidden="true">📁</span>
                <span className="text-sm font-medium text-slate-600">
                  Click to choose a file
                </span>
                <span className="text-xs text-slate-400">
                  or drag and drop here
                </span>
                <input
                  id="doc-file-input"
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  className="sr-only"
                  onChange={() => setFileError(null)}
                />
              </label>

              {fileError && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {fileError}
                </p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Document Type */}
              <FieldWrapper
                label="Document Type"
                htmlFor="doc-type"
                error={errors.document_type?.message}
                required
              >
                <select
                  id="doc-type"
                  className={selectCls(!!errors.document_type)}
                  {...register("document_type")}
                >
                  <option value="">Select type…</option>
                  {DOCUMENT_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {humanize(t)}
                    </option>
                  ))}
                </select>
              </FieldWrapper>

              {/* Expiration Date */}
              <FieldWrapper
                label="Expiration Date"
                htmlFor="doc-expiration"
                error={errors.expiration_date?.message}
              >
                <input
                  id="doc-expiration"
                  type="date"
                  className={inputCls(!!errors.expiration_date)}
                  {...register("expiration_date")}
                />
              </FieldWrapper>

              {/* Manager Notes — full width */}
              <div className="sm:col-span-2">
                <FieldWrapper
                  label="Manager Notes"
                  htmlFor="doc-notes"
                  error={errors.manager_notes?.message}
                >
                  <textarea
                    id="doc-notes"
                    rows={3}
                    placeholder="Any context about this document (optional)"
                    className={[
                      "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 outline-none resize-y min-h-[80px]",
                      "placeholder:text-slate-400 transition-colors duration-150",
                      "focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
                      errors.manager_notes
                        ? "border-red-400 bg-red-50"
                        : "border-slate-300 bg-white hover:border-slate-400",
                    ].join(" ")}
                    {...register("manager_notes")}
                  />
                </FieldWrapper>
              </div>
            </div>

            {/* Upload progress bar */}
            {uploadProgress !== null && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>Uploading…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end rounded-b-xl border-t border-slate-100 bg-slate-50 px-6 py-4 sm:px-8">
            <button
              type="submit"
              id="btn-doc-upload"
              disabled={isUploading}
              className={[
                "rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors",
                isUploading
                  ? "cursor-not-allowed bg-indigo-300"
                  : "bg-indigo-600 hover:bg-indigo-700",
              ].join(" ")}
            >
              {isUploading ? "Uploading…" : "Upload Document"}
            </button>
          </div>
        </div>
      </form>

      {/* ════ Section 3: Status legend ════ */}
      <div className="flex flex-wrap gap-3 px-1">
        <p className="w-full text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Status legend
        </p>
        {DOCUMENT_STATUS_OPTIONS.map((s) => {
          const b = STATUS_BADGE[s];
          return (
            <span
              key={s}
              className={[
                "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                b.bg, b.text, b.border,
              ].join(" ")}
            >
              {humanize(s)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
