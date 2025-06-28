import { twMerge } from "tailwind-merge";

export default function classNames(...classes: unknown[]) {
  return twMerge(classes.filter(Boolean).join(" "));
}
