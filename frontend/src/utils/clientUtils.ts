import { type ProgramSummary, type FirestoreDateValue } from "@/firebase/clientDbService";

export function getPrimaryProgramDisplay(programs: ProgramSummary[]) {
  if (!programs || !Array.isArray(programs) || programs.length === 0) {
    return {
      primaryProgram: null,
      additionalCount: 0,
      allNames: [],
    };
  }

  const now = new Date();
  const parseDate = (d: FirestoreDateValue) => {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (typeof d === "object" && "toDate" in d) return d.toDate();
    if (typeof d === "number" || typeof d === "string") return new Date(d);
    return null;
  };

  const active: ProgramSummary[] = [];
  const upcoming: ProgramSummary[] = [];
  const past: ProgramSummary[] = [];

  programs.forEach((p) => {
    const start = p.start_date ? parseDate(p.start_date) : null;
    const end = p.end_date ? parseDate(p.end_date) : null;

    if (start && start > now) {
      upcoming.push(p);
    } else if (end && end < now) {
      past.push(p);
    } else {
      active.push(p);
    }
  });

  upcoming.sort((a, b) => {
    const dateA = a.start_date ? parseDate(a.start_date) : null;
    const dateB = b.start_date ? parseDate(b.start_date) : null;
    const dA = dateA ? dateA.getTime() : 0;
    const dB = dateB ? dateB.getTime() : 0;
    return dA - dB;
  });

  past.sort((a, b) => {
    const dateA = a.end_date ? parseDate(a.end_date) : null;
    const dateB = b.end_date ? parseDate(b.end_date) : null;
    const dA = dateA ? dateA.getTime() : 0;
    const dB = dateB ? dateB.getTime() : 0;
    return dB - dA;
  });

  let primaryProgram = null;
  if (active.length > 0) {
    primaryProgram = active[0];
  } else if (upcoming.length > 0) {
    primaryProgram = upcoming[0];
  } else if (past.length > 0) {
    primaryProgram = past[0];
  }

  return {
    primaryProgram,
    additionalCount: programs.length > 1 ? programs.length - 1 : 0,
    allNames: programs.map((p) => p.name || "Unnamed Program"),
  };
}
