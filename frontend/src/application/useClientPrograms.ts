import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  fetchAllPrograms,
  assignClientToProgram,
  removeClientFromProgram,
  type ProgramSummary,
} from "@/firebase/clientDbService";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseClientProgramsReturn {
  /** Programs the client is currently enrolled in (derived from programIds prop). */
  enrolledPrograms: ProgramSummary[];
  /** All programs in the system — used to populate the assignment dropdown. */
  allPrograms: ProgramSummary[];
  /** Programs not yet assigned to this client — the filtered dropdown list. */
  availablePrograms: ProgramSummary[];
  isLoading: boolean;
  error: string | null;
  /** Assign this client to a program. Optimistically updates local state. */
  assign: (programId: string) => Promise<void>;
  /** Remove this client from a program. Optimistically updates local state. */
  remove: (programId: string) => Promise<void>;
}

// ─── Tier 2: Custom Hook ──────────────────────────────────────────────────────

/**
 * Manages the full program-enrollment lifecycle for a single client.
 *
 * @param clientId      - The Firestore document ID of the client.
 * @param programIds    - The current `program_ids` array from the client doc.
 *                        Defaults to `[]` to safely handle legacy documents that
 *                        do not yet have this field.
 *
 * Architecture:
 *   - Tier 4 calls: fetchAllPrograms, assignClientToProgram, removeClientFromProgram
 *   - Does NOT import or call any programs-domain services or hooks.
 *   - State mutations are optimistic: the UI updates instantly while Firestore
 *     persists in the background, then reverts on failure.
 */
export function useClientPrograms(
  clientId: string,
  programIds: string[] = []
): UseClientProgramsReturn {
  const [allPrograms, setAllPrograms] = useState<ProgramSummary[]>([]);
  const [localProgramIds, setLocalProgramIds] = useState<string[]>(programIds);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ── Keep local IDs in sync if the parent re-renders with a new client ──────
  useEffect(() => {
    setLocalProgramIds(programIds);
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: We intentionally depend only on clientId (not programIds) here so
  // that optimistic updates aren't clobbered by React re-renders triggered by
  // the parent passing down the same prop during a Firestore real-time update.

  // ── Load all programs once on mount ──────────────────────────────────────────
  useEffect(() => {
    let isCancelled = false;

    setIsLoading(true);
    setError(null);

    fetchAllPrograms()
      .then((programs) => {
        if (isCancelled) return;
        setAllPrograms(programs);
      })
      .catch((err) => {
        if (isCancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load programs.";
        setError(message);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []); // Programs list is stable — no re-fetch needed unless component remounts

  // ── Derived state ─────────────────────────────────────────────────────────────
  const enrolledPrograms = allPrograms.filter((p) =>
    localProgramIds.includes(p.id)
  );

  const availablePrograms = allPrograms.filter(
    (p) => !localProgramIds.includes(p.id)
  );

  // ── Action: Assign ────────────────────────────────────────────────────────────
  const assign = useCallback(
    async (programId: string) => {
      // Optimistic update — add to local IDs immediately
      setLocalProgramIds((prev) =>
        prev.includes(programId) ? prev : [...prev, programId]
      );

      try {
        await assignClientToProgram(clientId, programId);
        toast.success("Client enrolled in program.");
      } catch (err) {
        // Revert optimistic update on failure
        setLocalProgramIds((prev) => prev.filter((id) => id !== programId));
        const message =
          err instanceof Error ? err.message : "Failed to assign program.";
        setError(message);
        toast.error("Failed to enroll client in program.");
      }
    },
    [clientId]
  );

  // ── Action: Remove ────────────────────────────────────────────────────────────
  const remove = useCallback(
    async (programId: string) => {
      // Optimistic update — remove from local IDs immediately
      setLocalProgramIds((prev) => prev.filter((id) => id !== programId));

      try {
        await removeClientFromProgram(clientId, programId);
        toast.success("Client removed from program.");
      } catch (err) {
        // Revert optimistic update on failure
        setLocalProgramIds((prev) => [...prev, programId]);
        const message =
          err instanceof Error ? err.message : "Failed to remove program.";
        setError(message);
        toast.error("Failed to remove client from program.");
      }
    },
    [clientId]
  );

  return {
    enrolledPrograms,
    allPrograms,
    availablePrograms,
    isLoading,
    error,
    assign,
    remove,
  };
}
