"use client";


import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { useRouter } from "next/navigation";

export default function UnconfirmedBookingBadge() {
  const { t } = useLocale();
  const router=useRouter();
  const { data: unconfirmedBookingCount } = trpc.viewer.me.bookingUnconfirmedCount.useQuery();
  if (!unconfirmedBookingCount) return null;
  return (
      <div 
        role="link"
        tabIndex={0}
        onKeyDown={(e:React.KeyboardEvent<HTMLDivElement>)=>{
          if(e.key === "Enter" || e.key === " "){
            e.preventDefault();
            e.stopPropagation();
            router.push("/bookings/unconfirmed");
          }
        }}
        onClick={(e:React.MouseEvent<HTMLDivElement>)=>{
          e.preventDefault();
          e.stopPropagation();
          router.push("/bookings/unconfirmed");
      }}>
        <Badge
          rounded
          title={t("unconfirmed_bookings_tooltip")}
          variant="orange"
          className="cursor-pointer hover:bg-orange-800 hover:text-orange-100">
          {unconfirmedBookingCount}
        </Badge>
    </div>
  );
}
