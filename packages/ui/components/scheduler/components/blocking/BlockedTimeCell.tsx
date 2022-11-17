import { classNames } from "@calcom/lib";

export function BlockedTimeCell() {
  return (
    <div
      className={classNames("group absolute inset-0 flex h-full flex-col  hover:cursor-not-allowed")}
      style={{
        backgroundColor: "#D1D5DB",
        opacity: 0.2,
        background:
          "repeating-linear-gradient( -45deg, #E5E7EB, #E5E7EB 4.5px, #D1D5DB 4.5px, #D1D5DB 22.5px )",
      }}
    />
  );
}
