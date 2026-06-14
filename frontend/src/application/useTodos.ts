import { useState, useEffect, useCallback } from "react";
import {
  fetchTodos,
  addTodo,
  toggleTodoCompletion,
  deleteTodo,
  type TodoDoc,
} from "@/firebase/todoService";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseTodosReturn {
  todos: TodoDoc[];
  isLoading: boolean;
  error: string | null;
  add: (text: string) => Promise<void>;
  toggle: (todoId: string, currentStatus: boolean) => Promise<void>;
  remove: (todoId: string) => Promise<void>;
}

// ─── Tier 2: Custom Hook ──────────────────────────────────────────────────────

/**
 * Manages the full todo lifecycle for a given context.
 *
 * - Pass a `clientId` to scope todos to a specific client (Client Dashboard).
 * - Omit `clientId` to use global/onboarding todos (clientId === null in DB).
 *
 * Exposes `add`, `toggle`, and `remove` as stable callbacks so the UI never
 * needs to import or call the service layer directly.
 */
export function useTodos(clientId?: string): UseTodosReturn {
  const [todos, setTodos] = useState<TodoDoc[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load todos whenever the clientId scope changes ──────────────────────────
  const loadTodos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTodos(clientId);
      setTodos(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load todos.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    let isCancelled = false;

    fetchTodos(clientId)
      .then((data) => {
        if (isCancelled) return;
        setTodos(data);
        setError(null);
      })
      .catch((err) => {
        if (isCancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load todos.";
        setError(message);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [clientId]);

  // ── Action: Add ─────────────────────────────────────────────────────────────
  const add = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      try {
        await addTodo(text, clientId);
        await loadTodos(); // Re-fetch to keep list in sync with Firestore ordering
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add todo.";
        setError(message);
      }
    },
    [clientId, loadTodos]
  );

  // ── Action: Toggle ──────────────────────────────────────────────────────────
  const toggle = useCallback(
    async (todoId: string, currentStatus: boolean) => {
      // Optimistic update for snappy UX
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todoId ? { ...t, isCompleted: !currentStatus } : t
        )
      );
      try {
        await toggleTodoCompletion(todoId, currentStatus);
      } catch (err) {
        // Revert on failure
        setTodos((prev) =>
          prev.map((t) =>
            t.id === todoId ? { ...t, isCompleted: currentStatus } : t
          )
        );
        const message =
          err instanceof Error ? err.message : "Failed to update todo.";
        setError(message);
      }
    },
    []
  );

  // ── Action: Remove ──────────────────────────────────────────────────────────
  const remove = useCallback(async (todoId: string) => {
    // Optimistic update
    setTodos((prev) => prev.filter((t) => t.id !== todoId));
    try {
      await deleteTodo(todoId);
    } catch (err) {
      // Re-fetch to restore removed item on failure
      await loadTodos();
      const message =
        err instanceof Error ? err.message : "Failed to delete todo.";
      setError(message);
    }
  }, [loadTodos]);

  return { todos, isLoading, error, add, toggle, remove };
}
