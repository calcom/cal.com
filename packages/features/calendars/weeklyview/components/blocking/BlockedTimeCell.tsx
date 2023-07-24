import { classNames } from "@calcom/lib";

export function BlockedTimeCell() {
  return (
    <div
      className={classNames(
        "group absolute inset-0 flex h-full flex-col  hover:cursor-not-allowed",
        "[--disabled-gradient-background:#E5E7EB] [--disabled-gradient-foreground:#D1D5DB] dark:[--disabled-gradient-background:#262626] dark:[--disabled-gradient-foreground:#393939]"
      )}
      style={{
        backgroundColor: "#D1D5DB",
        background:
          "repeating-linear-gradient( -45deg, var(--disabled-gradient-background), var(--disabled-gradient-background) 2.5px, var(--disabled-gradient-foreground) 2.5px, var(--disabled-gradient-foreground) 6.5px )",
      }}
    />
  );
}
