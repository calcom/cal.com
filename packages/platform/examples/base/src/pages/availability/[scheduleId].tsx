import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";
import { useRouter } from "next/router";
import { useRef, useCallback } from "react";

import type { AvailabilitySettingsFormRef } from "@calcom/atoms";
import { AvailabilitySettings } from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });

export default function Availability(props: { calUsername: string; calEmail: string }) {
  const router = useRouter();
  const availabilityRef = useRef<AvailabilitySettingsFormRef>(null);

  const handleFormStateChange = useCallback((formState: unknown) => {
    console.log(formState, "formStateeeeee");
  }, []);

  const handleValidate = async () => {
    const result = await availabilityRef.current?.validateForm();
    console.log("Validation result:", result);
  };

  const handleSubmit = () => {
    availabilityRef.current?.handleFormSubmit({
      onSuccess: () => {
        console.log("Form submitted successfully");
      },
      onError: (error) => {
        console.error("Form submission failed:", error);
      },
    });
  };

  return (
    <main className={`flex min-h-screen flex-col ${inter.className}`}>
      <Navbar username={props.calUsername} />
      <div>
        <h1 className="mx-10 my-4 text-2xl font-semibold">Availability Settings</h1>

        <div className="mx-10 mb-4 flex flex-col gap-4">
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
          id={router.query.scheduleId as string}
          ref={availabilityRef}
          enableOverrides={true}
          /* customClassNames={{
            subtitlesClassName: "text-red-500",
            ctaClassName: "border p-4 rounded-md",
            editableHeadingClassName: "underline font-semibold",
            hiddenSwitchClassname: { thumb: "bg-red-500" },
            scheduleClassNames: {
              schedule: "bg-blue-50 border-2 border-blue-200 rounded-lg p-4",
              scheduleDay: "bg-green-50 border border-green-300 rounded-md mb-2",
              dayRanges: "bg-yellow-50 p-3 rounded border-l-4 border-yellow-400",
              timeRangeField: "text-2xl! bg-red-50 border-2 border-red-300 rounded-xl px-4 py-2",
              labelAndSwitchContainer: "bg-purple-50 border border-purple-200 rounded p-2",
              scheduleContainer: "bg-gray-100 border-4 border-gray-400 rounded-2xl shadow-lg",
              timePicker: {
                container: "bg-blue-900!",
                valueContainer: "bg-pink-500!",
                value: "bg-yellow-500!",
                input: "bg-green-500!",
                dropdown: "bg-cyan-500!",
              },
            },
            dateOverrideClassNames: {
              container: "p-4 bg-gray-900 rounded-md",
              title: "text-red-500 font-bold",
              description: "text-white",
              button: "text-black",
            },
          }} */
          onFormStateChange={handleFormStateChange}
          onUpdateSuccess={() => {
            console.log("Updated successfully");
            router.push(`/availability`);
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
