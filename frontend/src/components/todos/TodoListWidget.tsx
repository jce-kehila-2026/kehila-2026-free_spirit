"use client";

import { useState, useRef, type FormEvent, type KeyboardEvent } from "react";
import { useTodos } from "@/hooks/useTodos";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TodoListWidgetProps {
  /** Pass a clientId to scope todos to a specific client. Omit for global/onboarding todos. */
  clientId?: string;
  /** Optional heading to display above the widget */
  title?: string;
}

// ─── Inline SVG icons (no external dep needed) ────────────────────────────────

function IconCheckCircle({ filled }: { filled: boolean }) {
  return filled ? (
    // Filled check-circle for completed state
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-5 w-5 shrink-0 text-indigo-600"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
        clipRule="evenodd"
      />
    </svg>
  ) : (
    // Empty circle for incomplete state
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-indigo-400 transition-colors"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-indigo-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
      />
    </svg>
  );
}

// ─── Tier 1: UI Component ──────────────────────────────────────────────────────

/**
 * A reusable, self-contained Todo List widget.
 *
 * Usage on a Client Dashboard:
 *   <TodoListWidget clientId={client.id} title="Client Tasks" />
 *
 * Usage on a General Onboarding page:
 *   <TodoListWidget title="Onboarding Checklist" />
 */
export default function TodoListWidget({
  clientId,
  title = "Tasks",
}: TodoListWidgetProps) {
  const { todos, isLoading, error, add, toggle, remove } = useTodos(clientId);

  const [inputValue, setInputValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const completedCount = todos.filter((t) => t.isCompleted).length;
  const totalCount = todos.length;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAdd = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isAdding) return;

    setIsAdding(true);
    await add(inputValue);
    setInputValue("");
    setIsAdding(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAdd();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {totalCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>
        {isLoading && <IconSpinner />}
      </div>

      {/* ── Add Input ── */}
      <form
        onSubmit={handleAdd}
        className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/60"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a new task…"
          disabled={isAdding}
          aria-label="New task text"
          className={[
            "flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2",
            "text-sm text-slate-800 placeholder:text-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            "transition-shadow",
          ].join(" ")}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isAdding}
          aria-label="Add task"
          className={[
            "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2",
            "text-sm font-semibold text-white bg-indigo-600 shadow-sm",
            "hover:bg-indigo-700 active:bg-indigo-800",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors duration-150",
          ].join(" ")}
        >
          {isAdding ? (
            <IconSpinner />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
          )}
          Add
        </button>
      </form>

      {/* ── Error Banner ── */}
      {error && (
        <div
          role="alert"
          className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          ⚠️ {error}
        </div>
      )}

      {/* ── Todo List ── */}
      <div className="flex-1 overflow-y-auto max-h-80">
        {!isLoading && todos.length === 0 ? (
          /* ── Empty State ── */
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center bg-slate-50">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-6 w-6 text-slate-400"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500">No tasks yet</p>
            <p className="text-xs text-slate-400">
              Add your first task using the field above.
            </p>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-slate-100">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/80"
              >
                {/* ── Checkbox ── */}
                <button
                  type="button"
                  onClick={() => toggle(todo.id, todo.isCompleted)}
                  aria-label={
                    todo.isCompleted
                      ? `Mark "${todo.text}" as incomplete`
                      : `Mark "${todo.text}" as complete`
                  }
                  aria-pressed={todo.isCompleted}
                  className="flex-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-full"
                >
                  <IconCheckCircle filled={todo.isCompleted} />
                </button>

                {/* ── Task Text ── */}
                <span
                  className={[
                    "flex-1 text-sm leading-relaxed break-words min-w-0",
                    todo.isCompleted
                      ? "line-through text-slate-400"
                      : "text-slate-800",
                  ].join(" ")}
                >
                  {todo.text}
                </span>

                {/* ── Delete Button ── */}
                <button
                  type="button"
                  onClick={() => remove(todo.id)}
                  aria-label={`Delete task: ${todo.text}`}
                  className={[
                    "flex-none rounded-md p-1.5 text-slate-300",
                    "opacity-0 group-hover:opacity-100",
                    "hover:bg-red-50 hover:text-red-500",
                    "focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-red-400",
                    "transition-all duration-150",
                  ].join(" ")}
                >
                  <IconTrash />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Footer Progress Bar ── */}
      {totalCount > 0 && (
        <div className="border-t border-slate-100 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 overflow-hidden rounded-full bg-slate-100 h-1.5">
              <div
                className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500 ease-out"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
                role="progressbar"
                aria-valuenow={completedCount}
                aria-valuemin={0}
                aria-valuemax={totalCount}
                aria-label="Task completion progress"
              />
            </div>
            <span className="text-xs text-slate-400 shrink-0">
              {Math.round((completedCount / totalCount) * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
