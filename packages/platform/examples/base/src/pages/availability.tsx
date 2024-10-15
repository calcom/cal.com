import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";

import { AvailabilitySettings } from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });

export default function Availability(props: { calUsername: string; calEmail: string }) {
  return (
    <main className={`flex min-h-screen flex-col ${inter.className}`}>
      <Navbar username={props.calUsername} />
      <div>
        <AvailabilitySettings
          enableOverrides={true}
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
    </main>
  );
}
