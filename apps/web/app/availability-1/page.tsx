import AvailabilityPage from "@pages/availability";
import { trpc } from "app/_trpc/client";

export default function Availability() {
  return <AvailabilityPage trpcAppDir={trpc} />;
}
