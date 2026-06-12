import { type ClientDoc } from "@/components/clients/ClientList";

// ─── CSV export helper ────────────────────────────────────────────────────────

/**
 * Converts an array of ClientDoc objects into a CSV string and triggers a
 * native browser download. The filename includes today's date.
 */

export function exportToCSV(rows: ClientDoc[]): void {
  const escaped = (val: unknown) =>
    `"${String(val ?? "").replace(/"/g, '""')}"`;

  const HEADERS = [
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Status",
    "Passport ID",
  ];

  const csvRows = [
    HEADERS.join(","),
    ...rows.map((c) =>
      [
        escaped(c.first_name),
        escaped(c.last_name),
        escaped(c.email),
        escaped(c.phone),
        escaped(c.status),
        c.passport_id
          ? `="${String(c.passport_id).replace(/"/g, '""')}"`
          : '""',
      ].join(","),
    ),
  ];

  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const today = new Date().toISOString().slice(0, 10);
  const filename = `free-spirit-clients-${today}.csv`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}