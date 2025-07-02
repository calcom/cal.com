import dynamic from "next/dynamic";

const DynamicBookingPostHogProvider = dynamic(() => import("./bookingProvider"), {
  ssr: false,
});

export default DynamicBookingPostHogProvider;
