import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";
import { useRef, useCallback } from "react";

import type { AvailabilitySettingsFormRef } from "@calcom/atoms";
import { AvailabilitySettings } from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });

export default function Availability(props: { calUsername: string; calEmail: string }) {
  const availabilityRef = useRef<AvailabilitySettingsFormRef>(null);

  const handleFormStateChange = useCallback((formState: unknown) => {
    console.log(formState, "formStateeeeee");
  }, []);

  const handleValidate = async () => {
    const result = await availabilityRef.current?.validateForm();
    console.log("Validation result:", result);
  };

  const handleSubmit = () => {
    availabilityRef.current?.handleFormSubmit();
  };

  return (
    <main className={`flex min-h-screen flex-col ${inter.className}`}>
      <Navbar username={props.calUsername} />
      <div>
        <h1 className="mx-10 my-4 text-2xl font-semibold">Availability Settings</h1>

        <div className="mx-10 mb-4 flex gap-4">
          <button
            onClick={handleValidate}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Validate Form
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Submit Form
          </button>
        </div>

        <AvailabilitySettings
          ref={availabilityRef}
          enableOverrides={true}
          customClassNames={{
            subtitlesClassName: "text-red-500",
            ctaClassName: "border p-4 rounded-md",
            editableHeadingClassName: "underline font-semibold",
            hiddenSwitchClassname: { thumb: "bg-red-500" },
          }}
          onFormStateChange={handleFormStateChange}
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
    </main>
  );
}
