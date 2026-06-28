import { IconChevronDown, IconSearch } from "@/components/ui/Icons";

interface ClientFilterBarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: "all" | "registered" | "invited" | "interested" | "draft") => void;
}

export default function ClientFilterBar({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
}: ClientFilterBarProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-[1.5rem] border border-white/80 bg-[#FFFDF8] p-4 shadow-[0_12px_30px_rgba(44,105,117,0.07)] sm:flex-row sm:items-center sm:p-5">
      {/* Search input */}
      <div className="relative flex-1">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#6A8589]">
          <IconSearch className="h-4 w-4" />
        </span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, passport ID, phone, or email…"
          className="w-full rounded-2xl border border-[#D7E3D5] bg-white py-3 pl-11 pr-4 text-sm text-[#173A40] shadow-sm placeholder:text-[#8BA0A3] focus:border-[#6BB2A0] focus:outline-none focus:ring-2 focus:ring-[#B9D4CC]"
        />
      </div>

      {/* Journey-status dropdown */}
      <div className="relative sm:w-52">
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | "registered" | "invited" | "interested" | "draft")
          }
          className="w-full appearance-none rounded-2xl border border-[#D7E3D5] bg-white py-3 pl-4 pr-10 text-sm font-semibold text-[#31585F] shadow-sm focus:border-[#6BB2A0] focus:outline-none focus:ring-2 focus:ring-[#B9D4CC]"
        >
          <option value="all">All Statuses</option>
          <option value="registered">Registered</option>
          <option value="invited">Invited</option>
          <option value="interested">Interested</option>
          <option value="draft">Draft</option>
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#6A8589]">
          <IconChevronDown className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}
