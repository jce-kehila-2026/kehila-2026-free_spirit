"use client";

import React, { useState } from "react";

import { DOCUMENT_TYPE_OPTIONS, type ClientDocument, type GlobalDocumentTemplate } from "@/schema/documentSchema";
import type { ClientDoc } from "@/components/clients/list/ClientList";
import CustomFieldsSection from "@/components/clients/fields/CustomFieldsSection";

// Import our Tier 2 Controller
import { useDocumentsTabController } from "./controllers/DocumentsTabController";

// ─── Props ────────────────────────────────────────────────────────────────────

interface DocumentsTabProps {
  client: ClientDoc;
}



// ─── Helpers (Pure UI) ────────────────────────────────────────────────────────

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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function humanizeCategory(cat: string) {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function selectCls(hasError: boolean) {
  return [
    "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 outline-none appearance-none",
    "transition-colors duration-150",
    "focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
    hasError ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-slate-300 bg-white hover:border-slate-400",
  ].join(" ");
}

// ─── FieldWrapper ─────────────────────────────────────────────────────────────

function FieldWrapper({
  label, htmlFor, error, required = false, children,
}: {
  label: string; htmlFor: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

// ─── DocumentRow ──────────────────────────────────────────────────────────────

function DocumentRow({ doc: document, onDelete }: { doc: ClientDocument; onDelete: () => void; }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#D7E3D5] bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center">
      <span className="text-xl" aria-hidden="true">{fileIcon(document.file_name)}</span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[#173A40]">{document.file_name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="text-xs text-slate-500">{humanize(document.document_type)}</span>
          {document.uploaded_at && <span className="text-xs text-slate-400">Uploaded: {formatDate(document.uploaded_at)}</span>}
        </div>
        {document.manager_notes && <p className="mt-1 truncate text-xs text-slate-400 italic">{document.manager_notes}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <a
          href={document.file_url} target="_blank" rel="noopener noreferrer"
          className="rounded-full bg-[#DCEBEF] px-3 py-1.5 text-xs font-bold text-[#2C6975] transition-colors hover:bg-[#C9DDE1]"
        >
          View ↗
        </a>
        <button
          type="button" onClick={onDelete}
          className="rounded-md px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── GlobalTemplateRow ────────────────────────────────────────────────────────

function GlobalTemplateRow({ template }: { template: GlobalDocumentTemplate }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#D0E8EC] bg-[#F0F8FB] px-4 py-4 shadow-sm sm:flex-row sm:items-center">
      <span className="text-xl" aria-hidden="true">{fileIcon(template.file_name)}</span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[#173A40]">{template.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="rounded-full bg-[#DCEBEF] px-2 py-0.5 text-xs font-semibold text-[#2C6975]">
            {humanizeCategory(template.category)}
          </span>
          <span className="text-xs text-slate-400">{formatBytes(template.file_size)}</span>
        </div>
        {template.description && (
          <p className="mt-1 truncate text-xs text-slate-400 italic">{template.description}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <a
          href={template.file_url}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="rounded-full bg-[#245C66] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#173A40]"
        >
          Download ⬇
        </a>
      </div>
    </div>
  );
}

// ─── Main Component (Tier 1: Dumb View) ───────────────────────────────────────

export default function DocumentsTab({ client }: DocumentsTabProps) {
  const { form, docs, globalTemplates, uploadState, actions } = useDocumentsTabController(client);
  const { formState: { errors, isSubmitting } } = form;

  const isUploading = uploadState.isLoading || isSubmitting || uploadState.uploadProgress !== null;

  const [isTemplatesOpen, setIsTemplatesOpen] = useState(true);
  const [isUploadsOpen, setIsUploadsOpen] = useState(true);

  return (
    <div className="space-y-6">
      {/* ════ Section 0: Global templates (collapsible, read-only) ════ */}
      {globalTemplates.length > 0 && (
        <div className="overflow-hidden rounded-[1.5rem] border border-[#C4DFE6] bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setIsTemplatesOpen((prev) => !prev)}
            className="flex w-full items-center justify-between border-b border-[#C4DFE6] bg-[#EEF7FA] px-6 py-4 sm:px-8 hover:bg-[#E3F2F6] transition-colors"
            aria-expanded={isTemplatesOpen}
          >
            <div className="text-left">
              <h2 className="text-base font-bold text-[#173A40]">Official Documents &amp; Templates</h2>
              <p className="mt-0.5 text-sm text-[#4A7A82]">
                {globalTemplates.length} template{globalTemplates.length === 1 ? "" : "s"} available · Download, fill out, and re-upload below
              </p>
            </div>
            <span
              className="ml-4 shrink-0 text-lg text-[#2C6975] transition-transform duration-200"
              style={{ transform: isTemplatesOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>
          {isTemplatesOpen && (
            <div className="p-6 sm:p-8">
              <div className="space-y-3">
                {globalTemplates.map((t) => (
                  <GlobalTemplateRow key={t.id} template={t} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════ Section 1: Uploaded client documents (collapsible) ════ */}
      <div className="overflow-hidden rounded-[1.5rem] border border-[#D7E3D5] bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setIsUploadsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between border-b border-[#D7E3D5] bg-[#F7FAF5] px-6 py-4 sm:px-8 hover:bg-[#EEF4EC] transition-colors"
          aria-expanded={isUploadsOpen}
        >
          <div className="text-left">
            <h2 className="text-base font-bold text-[#173A40]">Uploaded Documents</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {docs.length === 0 ? "No documents on file yet." : `${docs.length} document${docs.length === 1 ? "" : "s"} on file`}
            </p>
          </div>
          <span
            className="ml-4 shrink-0 text-lg text-[#2C6975] transition-transform duration-200"
            style={{ transform: isUploadsOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            aria-hidden="true"
          >
            ▾
          </span>
        </button>
        {isUploadsOpen && (
          <div className="p-6 sm:p-8">
            {docs.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-400">No documents uploaded yet. Use the form below to add one.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {docs.map((d, i) => (
                  <DocumentRow key={`${d.file_name}-${i}`} doc={d} onDelete={() => actions.handleDelete(i)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════ Section 2: Collapsible upload form ════ */}
      <UploadSection
        form={form}
        errors={errors}
        isUploading={isUploading}
        uploadState={uploadState}
        actions={actions}
      />

      <CustomFieldsSection tab="documents" client={client} isEditable />

    </div>
  );
}

// ─── UploadSection (isolated collapsible wrapper) ─────────────────────────────

function UploadSection({
  form,
  errors,
  isUploading,
  uploadState,
  actions,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
  isUploading: boolean;
  uploadState: {
    isLoading: boolean;
    uploadProgress: number | null;
    fileError: string | null;
    setFileError: (v: string | null) => void;
    selectedFile: File | null;
    setSelectedFile: (v: File | null) => void;
  };
  actions: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSubmit: (data: any) => Promise<void>;
  };
}) {
  const { handleSubmit, register } = form;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#D7E3D5] bg-white shadow-sm">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between border-b border-[#D7E3D5] bg-[#F7FAF5] px-6 py-4 sm:px-8 hover:bg-[#EEF4EC] transition-colors"
        aria-expanded={isOpen}
      >
        <div className="text-left">
          <h2 className="text-base font-bold text-[#173A40]">Upload New Document</h2>
          <p className="mt-0.5 text-sm text-slate-500">PDF, JPEG, PNG, WebP, or HEIC · Max 10 MB</p>
        </div>
        <span
          className="ml-4 shrink-0 text-lg text-[#2C6975] transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {/* Collapsible body */}
      {isOpen && (
        <form onSubmit={handleSubmit(actions.onSubmit)} noValidate>
          <div className="space-y-5 p-6 sm:p-8">
            {/* File picker */}
            <div className="flex flex-col gap-1">
              <label htmlFor="doc-file-input" className="text-sm font-semibold text-slate-700">
                File <span className="ml-1 text-red-500" aria-hidden="true">*</span>
              </label>

              <label
                htmlFor="doc-file-input"
                className={[
                  "flex cursor-pointer flex-col items-center justify-center gap-2",
                  "rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
                  uploadState.fileError
                    ? "border-red-300 bg-red-50"
                    : uploadState.selectedFile
                    ? "border-indigo-300 bg-indigo-50 hover:border-indigo-400"
                    : "border-[#B9CFCA] bg-[#F7FAF5] hover:border-[#6BB2A0] hover:bg-[#EEF4EC]",
                ].join(" ")}
              >
                {uploadState.selectedFile ? (
                  <>
                    <span className="text-2xl" aria-hidden="true">📄</span>
                    <span className="max-w-xs truncate text-sm font-bold text-indigo-700">
                      {uploadState.selectedFile.name}
                    </span>
                    <span className="text-xs text-indigo-500">
                      {(uploadState.selectedFile.size / 1024 / 1024).toFixed(2)} MB · Click to change
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl" aria-hidden="true">📁</span>
                    <span className="text-sm font-bold text-[#31585F]">Click to choose a file</span>
                    <span className="text-xs text-[#6A8589]">or drag and drop here</span>
                  </>
                )}
                <input
                  id="doc-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" className="sr-only"
                  onChange={(e) => {
                    uploadState.setFileError(null);
                    uploadState.setSelectedFile(e.target.files?.[0] ?? null);
                  }}
                />
              </label>

              {uploadState.fileError && (
                <p role="alert" className="text-xs font-medium text-red-600">{uploadState.fileError}</p>
              )}
            </div>

            <div className="grid gap-5">
              <FieldWrapper label="Document Type" htmlFor="doc-type" error={errors.document_type?.message} required>
                <select id="doc-type" className={selectCls(!!errors.document_type)} {...register("document_type")}>
                  <option value="">Select type…</option>
                  {DOCUMENT_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
                </select>
              </FieldWrapper>

              <div>
                <FieldWrapper label="Notes" htmlFor="doc-notes" error={errors.manager_notes?.message}>
                  <textarea
                    id="doc-notes" rows={3} placeholder="Any context about this document (optional)"
                    className={[
                      "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 outline-none resize-y min-h-[80px]",
                      "placeholder:text-slate-400 transition-colors duration-150",
                      "focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
                      errors.manager_notes ? "border-red-400 bg-red-50" : "border-slate-300 bg-white hover:border-slate-400",
                    ].join(" ")}
                    {...register("manager_notes")}
                  />
                </FieldWrapper>
              </div>
            </div>

            {uploadState.uploadProgress !== null && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>Uploading…</span>
                  <span>{uploadState.uploadProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-indigo-500 transition-all duration-200" style={{ width: `${uploadState.uploadProgress}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end border-t border-[#D7E3D5] bg-[#F7FAF5] px-6 py-4 sm:px-8">
            <button
              type="submit" disabled={isUploading}
              className={[
                "rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors",
                isUploading ? "cursor-not-allowed bg-[#9CBAB4]" : "bg-[#245C66] hover:bg-[#173A40]",
              ].join(" ")}
            >
              {isUploading ? "Uploading…" : "Upload Document"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
