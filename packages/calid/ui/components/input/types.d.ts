import type { VariantProps } from "class-variance-authority";

export type InputProps = Omit<JSX.IntrinsicElements["input"], "size" | "ref"> &
  VariantProps<typeof inputStyles> & {
    isFullWidth?: boolean;
  };
