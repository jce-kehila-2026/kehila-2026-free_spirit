import React, { useState } from "react";
import { type ClientDoc } from "@/components/clients/list/ClientList";
import { manageClientStay } from "@/application/ClientManagementService";
import { Pencil } from "lucide-react";

interface StayHistoryModalProps {
  client: ClientDoc;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function formatStayDuration(arrivalDateStr: string, departureDateStr: string): string {
  const start = new Date(arrivalDateStr);
  const end = new Date(departureDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return "Unknown";
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  
  if (diffTime <= 0) {
    return "Less than a day";
  }

  let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const years = Math.floor(diffDays / 365);
  diffDays -= years * 365;

  const months = Math.floor(diffDays / 30);
  diffDays -= months * 30;

  const weeks = Math.floor(diffDays / 7);
  diffDays -= weeks * 7;

  const days = diffDays;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`);
  if (weeks > 0) parts.push(`${weeks} week${weeks > 1 ? "s" : ""}`);
  if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);

  if (parts.length === 0) return "Less than a day";
  
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  
  const lastPart = parts.pop();
  return `${parts.join(", ")}, and ${lastPart}`;
}

export default function StayHistoryModal({ client, isOpen, onClose, onSuccess }: StayHistoryModalProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editArrivalDate, setEditArrivalDate] = useState("");
  const [editDepartureDate, setEditDepartureDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const stays = client.stays || [];

  function handleEditClick(index: number, stay: { arrivedAt: string; departedAt: string | null }) {
    setEditingIndex(index);
    setEditArrivalDate(new Date(stay.arrivedAt).toISOString().split("T")[0]);
    setEditDepartureDate(stay.departedAt ? new Date(stay.departedAt).toISOString().split("T")[0] : "");
  }

  function handleCancelEdit() {
    setEditingIndex(null);
    setEditArrivalDate("");
    setEditDepartureDate("");
  }

  async function handleSave(index: number, deleteRecord: boolean) {
    if (deleteRecord && !window.confirm("Are you sure you want to delete this stay record?")) return;
    
    setIsSaving(true);
    try {
      await manageClientStay(
        client.id,
        index,
        editArrivalDate,
        editDepartureDate || null,
        deleteRecord
      );
      setEditingIndex(null);
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#15383E]">Stay History</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-7 w-7 items-center justify-center rounded-full text-lg font-bold text-[#6A8589] transition hover:bg-slate-100 hover:text-[#173A40] disabled:opacity-50"
          >
            &times;
          </button>
        </div>

        {stays.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#829497]">No stay history recorded.</div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <div className="flex flex-col gap-3">
              {stays.map((stay, index) => {
                const isEditing = editingIndex === index;
                
                if (isEditing) {
                  return (
                    <div key={index} className="rounded-xl border border-[#6BB2A0] bg-[#FAFAFA] p-4">
                      <div className="mb-3 grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1 block text-xs font-bold text-[#527078]">Arrival Date</label>
                          <input
                            type="date"
                            value={editArrivalDate}
                            onChange={(e) => setEditArrivalDate(e.target.value)}
                            disabled={isSaving}
                            className="w-full rounded-xl border border-[#BFD0CA] bg-white px-3 py-2 text-sm text-[#31585F] outline-none transition focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4] disabled:cursor-not-allowed disabled:opacity-70"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold text-[#527078]">Departure Date</label>
                          <input
                            type="date"
                            value={editDepartureDate}
                            onChange={(e) => setEditDepartureDate(e.target.value)}
                            disabled={isSaving}
                            className="w-full rounded-xl border border-[#BFD0CA] bg-white px-3 py-2 text-sm text-[#31585F] outline-none transition focus:border-[#6BB2A0] focus:ring-4 focus:ring-[#D7E7D4] disabled:cursor-not-allowed disabled:opacity-70"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <button
                          type="button"
                          onClick={() => handleSave(index, true)}
                          disabled={isSaving}
                          className="rounded-full bg-[#FFF2EF] px-4 py-1.5 text-sm font-bold text-[#A3483C] transition hover:bg-[#FBE9E7] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSaving ? "..." : "Delete Record"}
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="rounded-full border border-[#BFD0CA] bg-white px-4 py-1.5 text-sm font-bold text-[#31585F] transition hover:bg-[#EEF4EC] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSave(index, false)}
                            disabled={isSaving || !editArrivalDate}
                            className="rounded-full bg-[#2C6975] px-5 py-1.5 text-sm font-bold text-white transition hover:bg-[#245C66] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSaving ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Read-only view
                const arrivalStr = new Date(stay.arrivedAt).toLocaleDateString();
                const departureStr = stay.departedAt ? new Date(stay.departedAt).toLocaleDateString() : "Present";
                
                let durationStr = "Presently staying";
                if (stay.departedAt) {
                  durationStr = formatStayDuration(stay.arrivedAt, stay.departedAt);
                } else {
                  durationStr = formatStayDuration(stay.arrivedAt, new Date().toISOString());
                }

                return (
                  <div key={index} className="flex items-center justify-between rounded-xl border border-[#D7E3D5] bg-white p-4 transition-colors hover:bg-[#FAFAFA]">
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-bold text-[#15383E]">
                        {arrivalStr} — {departureStr}
                      </div>
                      <div className="text-xs font-medium text-[#6A8589]">
                        Duration: {durationStr}
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleEditClick(index, stay)}
                      disabled={isSaving}
                      className="flex items-center justify-center rounded p-2 text-[#6A8589] transition hover:bg-[#EEF4EC] hover:text-[#2C6975] disabled:cursor-not-allowed disabled:opacity-50"
                      title="Edit Stay"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
