import type { LucideProps } from "lucide-react";

export type SVGComponent = (props: Omit<LucideProps, "ref">) => JSX.Element;
