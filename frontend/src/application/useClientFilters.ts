import { useState, useMemo, useEffect } from "react";
import { type ClientDoc } from "@/components/clients/list/ClientList";
import { fetchAllPrograms, type ProgramSummary } from "@/firebase/clientDbService";

export const useClientFilters = (allDocs: ClientDoc[]) => {
  // ── Search & filter state ─────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "registered" | "invited" | "interested" | "draft"
  >("all");
  const [programMap, setProgramMap] = useState<Record<string, ProgramSummary>>({});

  useEffect(() => {
    let isCancelled = false;
    fetchAllPrograms()
      .then((programs) => {
        if (isCancelled) return;
        const map: Record<string, ProgramSummary> = {};
        programs.forEach((p) => {
          map[p.id] = p;
        });
        setProgramMap(map);
      })
      .catch((err) => {
        console.error("Failed to load programs for client list filters", err);
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  const [columnFilters, setColumnFilters] = useState<Record<string, { text: string; values: string[] }>>({
    name: { text: "", values: [] },
    email: { text: "", values: [] },
    phone: { text: "", values: [] },
    status: { text: "", values: [] },
    programs: { text: "", values: [] },
  });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  function handleColumnFilterChange(col: string, update: Partial<{ text: string; values: string[] }>) {
    setColumnFilters((prev) => ({
      ...prev,
      [col]: { ...prev[col], ...update },
    }));
  }

  function handleClearAllFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setColumnFilters({
      name: { text: "", values: [] },
      email: { text: "", values: [] },
      phone: { text: "", values: [] },
      status: { text: "", values: [] },
      programs: { text: "", values: [] },
    });
    setSortConfig(null);
  }

  const hasActiveFilters =
    searchQuery !== "" ||
    statusFilter !== "all" ||
    sortConfig !== null ||
    Object.values(columnFilters).some((cf) => cf.text !== "" || cf.values.length > 0);

  // ── Total active count ──────────
  const totalActiveCount = useMemo(
    () => allDocs.filter((c) => c.is_archived !== true).length,
    [allDocs],
  );

  // ── Filtered clients ───────────────
  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const result = allDocs.filter((client) => {
      if (statusFilter !== "all" && client.status !== statusFilter) return false;

      const nameVal = `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim();
      if (columnFilters.name.text && !nameVal.toLowerCase().includes(columnFilters.name.text.toLowerCase())) return false;
      if (columnFilters.name.values.length > 0 && !columnFilters.name.values.includes(nameVal)) return false;

      const emailVal = client.email || "";
      if (columnFilters.email.text && !emailVal.toLowerCase().includes(columnFilters.email.text.toLowerCase())) return false;
      if (columnFilters.email.values.length > 0 && !columnFilters.email.values.includes(emailVal)) return false;

      const phoneVal = client.phone || "";
      if (columnFilters.phone.text && !phoneVal.toLowerCase().includes(columnFilters.phone.text.toLowerCase())) return false;
      if (columnFilters.phone.values.length > 0 && !columnFilters.phone.values.includes(phoneVal)) return false;

      const statusVal = client.status || "";
      if (columnFilters.status.text && !statusVal.toLowerCase().includes(columnFilters.status.text.toLowerCase())) return false;
      if (columnFilters.status.values.length > 0 && !columnFilters.status.values.includes(statusVal)) return false;

      if (columnFilters.programs && columnFilters.programs.values.length > 0) {
        const clientProgramIds = Array.isArray(client.program_ids) ? client.program_ids : [];
        const validProgramIds = clientProgramIds.filter(id => !!programMap[id]);
        let match = false;
        
        if (columnFilters.programs.values.includes("(No Program Assigned)") && validProgramIds.length === 0) {
          match = true;
        }
        if (columnFilters.programs.values.includes("(Has Program)") && validProgramIds.length > 0) {
          match = true;
        }
        
        if (!match) {
          const assignedNames = validProgramIds.map(id => programMap[id].name).filter(Boolean);
          match = columnFilters.programs.values.some(v => assignedNames.includes(v));
        }
        
        if (!match) return false;
      }

      if (!q) return true;
      return [
        client.first_name,
        client.last_name,
        client.email,
        client.phone,
        client.passport_id,
      ].some((field) => field?.toLowerCase().includes(q));
    });

    if (sortConfig) {
      result.sort((a, b) => {
        let valA = ""; let valB = "";
        if (sortConfig.key === "name") {
          valA = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim().toLowerCase();
          valB = `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim().toLowerCase();
        } else if (sortConfig.key === "email") {
          valA = (a.email || "").toLowerCase(); valB = (b.email || "").toLowerCase();
        } else if (sortConfig.key === "phone") {
          valA = (a.phone || "").toLowerCase(); valB = (b.phone || "").toLowerCase();
        } else if (sortConfig.key === "status") {
          valA = (a.status || "").toLowerCase(); valB = (b.status || "").toLowerCase();
        } else if (sortConfig.key === "programs") {
          valA = (Array.isArray(a.program_ids) && a.program_ids[0] ? (programMap[a.program_ids[0]]?.name || "") : "").toLowerCase();
          valB = (Array.isArray(b.program_ids) && b.program_ids[0] ? (programMap[b.program_ids[0]]?.name || "") : "").toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [allDocs, searchQuery, statusFilter, columnFilters, sortConfig, programMap]);

  // Return everything the UI needs
  return {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    columnFilters, handleColumnFilterChange,
    sortConfig, setSortConfig,
    handleClearAllFilters,
    hasActiveFilters,
    totalActiveCount,
    filteredClients,
    programMap
  };
};
