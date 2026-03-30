import type { ExperimentStatusDto } from "./ExperimentConfigDto";

export interface AdminExperimentViewDto {
  slug: string;
  label: string | null;
  description: string | null;
  target: string;
  codeVariants: string[];
  status: ExperimentStatusDto;
  winner: string | null;
  variants: { slug: string; label: string | null; weight: number }[];
}
