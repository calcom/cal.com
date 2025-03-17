import { useLocale } from "@calcom/lib/hooks/useLocale";

type Props = {
  /**
   * Whether to show the exact number of seats available or not
   *
   * @default true
   */
  showExact: boolean;
  /**
   * Shows available seats count as either whole number or fraction.
   *
   * Applies only when `showExact` is `true`
   *
   * @default "whole"
   */
  variant?: "whole" | "fraction";
  /** Number of seats booked in the event */
  bookedSeats: number;
  /** Total number of seats in the event */
  totalSeats: number;
};

export const SeatsAvailabilityText = ({
  showExact = true,
  bookedSeats,
  totalSeats,
  variant = "whole",
}: Props) => {
  const { t } = useLocale();
  const availableSeats = totalSeats - bookedSeats;
  const isHalfFull = bookedSeats / totalSeats >= 0.5;
  const isNearlyFull = bookedSeats / totalSeats >= 0.83;

  return (
    <span className="truncate">
      {showExact
        ? `${availableSeats}${variant === "fraction" ? ` / ${totalSeats}` : ""} ${t("seats_available", {
            count: availableSeats,
          })}`
        : isNearlyFull
        ? t("seats_nearly_full")
        : isHalfFull
        ? t("seats_half_full")
        : t("seats_available", {
            count: availableSeats,
          })}
    </span>
  );
};
