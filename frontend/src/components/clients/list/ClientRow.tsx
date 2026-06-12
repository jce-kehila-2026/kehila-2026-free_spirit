"use client";

import { Eye } from "lucide-react";
import { type ClientDoc } from "@/components/clients/list/ClientList";
import { QuickCopy } from "@/components/ui/QuickCopy";
import { IconRestore, IconPencil } from "@/components/ui/Icons";

// Note: We can just use the status badge component from your list page or import it
interface ClientRowProps {
  client: ClientDoc;
  showArchived: boolean;
  onEdit: (client: ClientDoc) => void;
  onRestoreSelect: (client: ClientDoc) => void;
  renderStatusBadge: (status: string) => React.ReactNode;
}

export default function ClientRow({
  client,
  showArchived,
  onEdit,
  onRestoreSelect,
  renderStatusBadge,
}: ClientRowProps) {
  return (
    <tr
      className={[
        "transition-colors",
        showArchived ? "hover:bg-amber-50" : "hover:bg-slate-50",
      ].join(" ")}
    >
      <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-800">
        <div className="flex items-center justify-between gap-2">
          <span>{client.first_name} {client.last_name}</span>
          <QuickCopy text={`${client.first_name} ${client.last_name}`} label="Name" />
        </div>
      </td>
      <td className="px-5 py-3.5 text-slate-600">
        <div className="flex items-center justify-between gap-2">
          <span>{client.email}</span>
          {client.email && <QuickCopy text={client.email} label="Email" />}
        </div>
      </td>
      <td className="hidden px-5 py-3.5 text-slate-600 sm:table-cell">
        <div className="flex items-center justify-between gap-2">
          <span>{client.phone}</span>
          {client.phone && <QuickCopy text={client.phone} label="Phone Number" />}
        </div>
      </td>
      <td className="px-5 py-3.5">
        {renderStatusBadge(client.status)}
      </td>
      <td className="w-10 py-3.5 pr-4 text-right">
        {showArchived ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              title="View Profile"
              id={`btn-view-archived-client-${client.id}`}
              onClick={() => onEdit(client)}
              aria-label={`View ${client.first_name} ${client.last_name}`}
              className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              id={`btn-restore-client-${client.id}`}
              onClick={() => onRestoreSelect(client)}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <IconRestore />
              Restore
            </button>
          </div>
        ) : (
          <button
            type="button"
            title="Edit"
            id={`btn-edit-client-${client.id}`}
            onClick={() => onEdit(client)}
            aria-label={`Edit ${client.first_name} ${client.last_name}`}
            className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <IconPencil />
          </button>
        )}
      </td>
    </tr>
  );
}