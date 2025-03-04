import type { MixedParams, PageProps } from "app/_types";
import { redirect } from "next/navigation";
import z from "zod";

const paramsSchema = z
  .object({
    pages: z.array(z.string()),
  })
  .catch({
    pages: [],
  });

export default function RoutingForms({ params }: Omit<PageProps, "params"> & { params: MixedParams }) {
  const { pages } = paramsSchema.parse(params);
  redirect(`/apps/routing-forms/${pages.length ? pages.join("/") : ""}`);
}
