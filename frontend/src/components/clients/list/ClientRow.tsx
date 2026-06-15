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
        showArchived ? "hover:bg-[#FBF5E8]" : "hover:bg-[#F7FAF5]",
      ].join(" ")}
    >
      <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#173A40]">
        <div className="flex items-center justify-between gap-2">
          <span>{client.first_name} {client.last_name}</span>
          <QuickCopy text={`${client.first_name} ${client.last_name}`} label="Name" />
        </div>
      </td>
      <td className="px-5 py-4 text-[#5C7478]">
        <div className="flex items-center justify-between gap-2">
          <span>{client.email}</span>
          {client.email && <QuickCopy text={client.email} label="Email" />}
        </div>
      </td>
      <td className="hidden px-5 py-4 text-[#5C7478] sm:table-cell">
        <div className="flex items-center justify-between gap-2">
          <span>{client.phone}</span>
          {client.phone && <QuickCopy text={client.phone} label="Phone Number" />}
        </div>
      </td>
      <td className="px-5 py-4">
        {renderStatusBadge(client.status)}
      </td>
      <td className="w-10 py-4 pr-5 text-right">
        {showArchived ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              title="View Profile"
              id={`btn-view-archived-client-${client.id}`}
              onClick={() => onEdit(client)}
              aria-label={`View ${client.first_name} ${client.last_name}`}
              className="inline-flex items-center justify-center rounded-full p-2 text-[#6A8589] transition-colors hover:bg-[#DCEBEF] hover:text-[#2C6975] focus:outline-none focus:ring-2 focus:ring-[#6BB2A0]"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              id={`btn-restore-client-${client.id}`}
              onClick={() => onRestoreSelect(client)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#E5F0E2] px-3 py-2 text-xs font-bold text-[#3F7763] transition-colors hover:bg-[#D8E9D5] focus:outline-none focus:ring-2 focus:ring-[#6BB2A0]"
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
            className="inline-flex items-center justify-center rounded-full p-2 text-[#6A8589] transition-colors hover:bg-[#DCEBEF] hover:text-[#2C6975] focus:outline-none focus:ring-2 focus:ring-[#6BB2A0]"
          >
            <IconPencil />
          </button>
        )}
      </td>
    </tr>
  );
}
