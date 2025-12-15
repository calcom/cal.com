"use client";

import { useRouter } from "next/navigation";

import { OneOffMeetingCalendarView } from "@calcom/features/one-off-meetings/components";

export default function CreateOneOffMeetingPage() {
  const router = useRouter();

  const handleSuccess = () => {
    // Stay on page - success state is shown in the component
  };

  const handleCancel = () => {
    router.push("/event-types");
  };

  return (
    <div className="bg-default flex h-screen w-full flex-col">
      <OneOffMeetingCalendarView onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
}
