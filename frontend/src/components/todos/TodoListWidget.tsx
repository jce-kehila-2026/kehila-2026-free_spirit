"use client";

import { useState, useRef, type FormEvent, type KeyboardEvent } from "react";
import { useTodos } from "@/application/useTodos";
import { IconCheckCircle, IconTrash, IconSpinner, IconPlus, IconClipboardList } from "@/components/ui/Icons";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TodoListWidgetProps {
  /** Pass a clientId to scope todos to a specific client. Omit for global/onboarding todos. */
  clientId?: string;
  /** Optional heading to display above the widget */
  title?: string;
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
            <IconPlus className="h-4 w-4" />
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
              <IconClipboardList />
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
