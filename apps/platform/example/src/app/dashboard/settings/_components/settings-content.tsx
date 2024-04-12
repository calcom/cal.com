"use client";
import { AvailabilitySettings } from "@calcom/atoms";
export const SettingsContent = () => {
  return (
    <div className="grid gap-6">
        <AvailabilitySettings
          customClassNames={{
            subtitlesClassName: "text-red-500",
            ctaClassName: "border p-4 rounded-md",
            editableHeadingClassName: "underline font-semibold",
          }}
          onUpdateSuccess={() => {
            console.log("Updated successfully");
          }}
          onUpdateError={() => {
            console.log("update error");
          }}
          onDeleteError={() => {
            console.log("delete error");
          }}
          onDeleteSuccess={() => {
            console.log("Deleted successfully");
          }}
        />
        </div>
  );
};
export default SettingsContent;