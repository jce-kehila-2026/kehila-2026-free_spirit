"use client";

import { IconCheck, IconAlertTriangle } from "@/components/ui/Icons";
import { calculateOverallProgress } from "@/utils/profileValidation";
import type { ClientDoc } from "@/components/clients/list/ClientList";

interface QuickGlanceBannerProps {
  client: ClientDoc;
}

export default function QuickGlanceBanner({ client }: QuickGlanceBannerProps) {
  const profileProgress = calculateOverallProgress(client as unknown as Record<string, unknown>);
  const isProfileComplete = profileProgress >= 85;

  return (
    <div className={`flex flex-col gap-3 rounded-[1.5rem] border px-5 py-4 shadow-sm w-full ${isProfileComplete ? "border-[#C5DDC0] bg-[#E5F0E2]" : "border-[#E5C97D] bg-[#F7EED8]"}`}>
      <div className="flex items-center gap-4">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white ${isProfileComplete ? "text-[#3F7763]" : "text-[#8A6822]"}`}>
          {isProfileComplete ? <IconCheck className="h-5 w-5" /> : <IconAlertTriangle className="h-5 w-5" />}
        </span>
        <div className="flex-1">
          <p className={`text-sm font-bold ${isProfileComplete ? "text-[#31585F]" : "text-[#785B20]"}`}>
            Quick Glance Alerts &amp; Notifications
          </p>
          <p className={`mt-1 text-xs leading-5 ${isProfileComplete ? "text-[#527078]" : "text-[#8A6822]"}`}>
            {isProfileComplete 
              ? "Profile is highly detailed. No critical actions required."
              : `Client profile is ${profileProgress}% complete. Please review missing information.`}
          </p>
        </div>
      </div>
      {/* Progress bar container (Masking Approach) */}
      <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        {/* Full-width gradient layer */}
        <div 
          className="absolute left-0 top-0 h-full w-full"
          style={{
            background: 'linear-gradient(to right, #ef4444 0%, #eab308 50%, #22c55e 100%)',
          }}
        />
        {/* Shrinking gray mask covering the right side */}
        <div 
          className="absolute right-0 top-0 h-full bg-gray-200 transition-all duration-500 ease-out"
          style={{
            width: `${100 - profileProgress}%`,
          }}
        />
      </div>
    </div>
  );
}
