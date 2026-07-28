"use client";

import React from "react";
import {
  GLOBAL_DOCUMENT_CATEGORY_OPTIONS,
  type GlobalDocumentTemplate,
} from "@/schema/documentSchema";
import { useGlobalDocumentManagerController } from "./controllers/GlobalDocumentManagerController";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface GlobalDocumentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Helpers (pure, no side-effects) ──────────────────────────────────────────

function humanizeCategory(cat: string) {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB");
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "📄";
  if (["jpg", "jpeg", "png", "webp"].includes(ext ?? "")) return "🖼️";
  return "📎";
}

const selectCls =
  "mt-1 w-full rounded-xl border border-[#BFD0CA] bg-white px-3.5 py-2.5 text-sm text-[#15383E] outline-none transition focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4] appearance-none";

// ─── TemplateRow ───────────────────────────────────────────────────────────────

function TemplateRow({
  template,
  isDeactivating,
  isReactivating,
  isDeleting,
  onDeactivate,
  onReactivate,
  onDelete,
}: {
  template: GlobalDocumentTemplate;
  isDeactivating: boolean;
  isReactivating: boolean;
  isDeleting: boolean;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const isBusy = isDeactivating || isReactivating || isDeleting;

  if (template.is_active) {
    return (
      <article className="rounded-xl border border-[#D7E3D5] bg-[#F7FAF5] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base" aria-hidden="true">
                {fileIcon(template.file_name)}
              </span>
              <p className="truncate font-bold text-[#15383E]">{template.title}</p>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="rounded-full bg-[#DCEBEF] px-2 py-0.5 text-xs font-semibold text-[#2C6975]">
                {humanizeCategory(template.category)}
              </span>
              <span className="text-xs text-slate-400">{formatBytes(template.file_size)}</span>
              <span className="text-xs text-slate-400">Uploaded: {formatDate(template.uploaded_at)}</span>
            </div>
            {template.description && (
              <p className="mt-1.5 truncate text-xs text-[#607B80]">{template.description}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <a
              href={template.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-[#B9CFCA] bg-white px-3 py-1.5 text-xs font-bold text-[#31585F] transition hover:bg-[#EEF4EC]"
            >
              View ↗
            </a>
            <button
              type="button"
              onClick={onDeactivate}
              disabled={isBusy}
              className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeactivating ? "Deactivating…" : "Deactivate"}
            </button>
          </div>
        </div>
      </article>
    );
  }

  // Inactive template row
  return (
    <article className="rounded-xl border border-[#E4ECE2] bg-[#F8F7F0] px-4 py-3 opacity-90">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">
              {fileIcon(template.file_name)}
            </span>
            <p className="truncate text-sm font-bold text-[#607B80]">{template.title}</p>
          </div>
          <p className="mt-0.5 text-xs text-[#8BA0A3]">
            {humanizeCategory(template.category)} · Inactive
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <a
            href={template.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-[#B9CFCA] bg-white px-3 py-1.5 text-xs font-bold text-[#31585F] transition hover:bg-[#EEF4EC]"
          >
            View ↗
          </a>
          <button
            type="button"
            onClick={onReactivate}
            disabled={isBusy}
            className="rounded-full border border-[#B9CFCA] bg-white px-3 py-1.5 text-xs font-bold text-[#31585F] transition hover:bg-[#EEF4EC] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isReactivating ? "Reactivating…" : "Reactivate"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isBusy}
            className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Main Component (Tier 1: Dumb View) ───────────────────────────────────────

export default function GlobalDocumentManagerModal({
  isOpen,
  onClose,
}: GlobalDocumentManagerModalProps) {
  const { form, templates, isLoadingTemplates, uploadState, actions, busyState } =
    useGlobalDocumentManagerController(isOpen);

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = form;

  const isBusy = uploadState.isUploading || isSubmitting || uploadState.uploadProgress !== null;

  const activeTemplates = templates.filter((t) => t.is_active);
  const inactiveTemplates = templates.filter((t) => !t.is_active);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15383E]/65 p-4 backdrop-blur-sm">
      <section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[1.75rem] border border-white/70 bg-[#FFFDF8] shadow-[0_24px_60px_rgba(21,56,62,0.28)]">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-3 border-b border-[#D7E3D5] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6A8589]">
              Global documents
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[#15383E]">
              Manage global documents
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-[#607B80]">
              Upload master template forms visible to all clients as read-only downloads. Clients
              can download blank forms, fill them out, and re-upload signed copies.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="self-start rounded-full border border-[#B9CFCA] bg-white px-4 py-2 text-sm font-bold text-[#31585F] transition hover:bg-[#EEF4EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0]"
          >
            Close
          </button>
        </header>

        {/* ── Body: two-column layout mirrors ClientFieldManagerModal ──────── */}
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_1.1fr]">

          {/* ── Left: Upload form ─────────────────────────────────────────── */}
          <div className="space-y-5">
            <form
              onSubmit={handleSubmit(actions.onSubmit)}
              noValidate
              className="rounded-2xl border border-[#D7E3D5] bg-white p-4"
            >
              <h3 className="text-sm font-bold text-[#15383E]">Upload new template</h3>

              <div className="mt-4 space-y-4">
                {/* File picker */}
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-[#31585F]">
                    File <span className="ml-1 text-red-500" aria-hidden="true">*</span>
                  </span>
                  <label
                    htmlFor="global-doc-file-input"
                    className={[
                      "flex cursor-pointer flex-col items-center justify-center gap-2",
                      "rounded-xl border-2 border-dashed px-6 py-6 text-center transition-colors",
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
                          {formatBytes(uploadState.selectedFile.size)} · Click to change
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl" aria-hidden="true">📁</span>
                        <span className="text-sm font-bold text-[#31585F]">Click to choose a file</span>
                        <span className="text-xs text-[#6A8589]">PDF, JPEG, PNG, WebP · Max 25 MB</span>
                      </>
                    )}
                    <input
                      id="global-doc-file-input"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="sr-only"
                      onChange={(e) => {
                        uploadState.setFileError(null);
                        uploadState.setSelectedFile(e.target.files?.[0] ?? null);
                      }}
                    />
                  </label>
                  {uploadState.fileError && (
                    <p role="alert" className="text-xs font-medium text-red-600">
                      {uploadState.fileError}
                    </p>
                  )}
                </div>

                {/* Title */}
                <label className="block">
                  <span className="text-sm font-semibold text-[#31585F]">
                    Title <span className="ml-1 text-red-500" aria-hidden="true">*</span>
                  </span>
                  <input
                    type="text"
                    maxLength={120}
                    placeholder="e.g. Medical Release Waiver"
                    className={[
                      "mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#15383E] outline-none transition",
                      "focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4]",
                      errors.title
                        ? "border-red-400 bg-red-50"
                        : "border-[#BFD0CA] bg-white",
                    ].join(" ")}
                    {...register("title")}
                  />
                  {errors.title && (
                    <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                      {errors.title.message}
                    </p>
                  )}
                </label>

                {/* Category */}
                <label className="block">
                  <span className="text-sm font-semibold text-[#31585F]">
                    Category <span className="ml-1 text-red-500" aria-hidden="true">*</span>
                  </span>
                  <select
                    className={[
                      selectCls,
                      errors.category ? "border-red-400 bg-red-50" : "",
                    ].join(" ")}
                    {...register("category")}
                  >
                    {GLOBAL_DOCUMENT_CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {humanizeCategory(cat)}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                      {errors.category.message}
                    </p>
                  )}
                </label>

                {/* Description */}
                <label className="block">
                  <span className="text-sm font-semibold text-[#31585F]">Description</span>
                  <textarea
                    rows={3}
                    maxLength={500}
                    placeholder="Brief note for managers or clients (optional)"
                    className={[
                      "mt-1 w-full resize-y rounded-xl border px-3.5 py-2.5 text-sm text-[#15383E] outline-none transition",
                      "min-h-[72px] placeholder:text-slate-400",
                      "focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4]",
                      errors.description ? "border-red-400 bg-red-50" : "border-[#BFD0CA] bg-white",
                    ].join(" ")}
                    {...register("description")}
                  />
                </label>

                {/* Progress bar */}
                {uploadState.uploadProgress !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-500">
                      <span>Uploading…</span>
                      <span>{uploadState.uploadProgress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-[#245C66] transition-all duration-200"
                        style={{ width: `${uploadState.uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isBusy}
                  className="inline-flex w-full items-center justify-center rounded-full bg-[#245C66] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#173A40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6BB2A0] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBusy ? "Uploading…" : "Upload template"}
                </button>
              </div>
            </form>
          </div>

          {/* ── Right: Template list ──────────────────────────────────────── */}
          <section className="rounded-2xl border border-[#D7E3D5] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-[#15383E]">Global templates</h3>
              {isLoadingTemplates && (
                <span className="text-xs font-semibold text-[#6A8589]">Loading…</span>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {/* Empty state */}
              {templates.length === 0 && !isLoadingTemplates && (
                <p className="rounded-xl border border-dashed border-[#B9CFCA] bg-[#EEF4EC] px-4 py-6 text-center text-sm font-medium text-[#607B80]">
                  No global templates yet. Upload one using the form.
                </p>
              )}

              {/* Active templates */}
              {activeTemplates.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-[#6A8589]">
                    Active
                  </h4>
                  {activeTemplates.map((t) => (
                    <TemplateRow
                      key={t.id}
                      template={t}
                      isDeactivating={busyState.deactivatingId === t.id}
                      isReactivating={busyState.reactivatingId === t.id}
                      isDeleting={busyState.deletingId === t.id}
                      onDeactivate={() => actions.handleDeactivate(t)}
                      onReactivate={() => actions.handleReactivate(t)}
                      onDelete={() => actions.handleDelete(t)}
                    />
                  ))}
                </div>
              )}

              {/* Inactive templates */}
              {inactiveTemplates.length > 0 && (
                <div className="space-y-3 border-t border-[#D7E3D5] pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-[#6A8589]">
                    Inactive
                  </h4>
                  {inactiveTemplates.map((t) => (
                    <TemplateRow
                      key={t.id}
                      template={t}
                      isDeactivating={busyState.deactivatingId === t.id}
                      isReactivating={busyState.reactivatingId === t.id}
                      isDeleting={busyState.deletingId === t.id}
                      onDeactivate={() => actions.handleDeactivate(t)}
                      onReactivate={() => actions.handleReactivate(t)}
                      onDelete={() => actions.handleDelete(t)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
