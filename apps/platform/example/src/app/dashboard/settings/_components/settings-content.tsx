"use client";
import { AvailabilitySettings } from "@calcom/atoms";
export const SettingsContent = () => {
  return (
    <div className="grid gap-6">
        <AvailabilitySettings
          customClassNames={{
            // this is to avoid layout shift when toggling days
            scheduleClassNames: {
                scheduleDay: "min-w-[480px]",
            }
          }}
          onUpdateSuccess={() => {
            console.log("[@calcom/atoms]: Updated successfully");
          }}
          onUpdateError={() => {
            console.log("[@calcom/atoms]: Update error");
          }}
          onDeleteError={() => {
            console.log("[@calcom/atoms]: Deletion error");
          }}
          onDeleteSuccess={() => {
            console.log("[@calcom/atoms]: Deleted successfully");
          }}
        />
        </div>
  );
};
export default SettingsContent;