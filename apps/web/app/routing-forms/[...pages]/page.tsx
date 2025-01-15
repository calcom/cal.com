import type { PageProps } from "app/_types";
import { redirect } from "next/navigation";
import z from "zod";

const paramsSchema = z
  .object({
    pages: z.array(z.string()),
  })
  .catch({
    pages: [],
  });

const Page = ({ params }: PageProps) => {
  const { pages } = paramsSchema.parse(params);

  redirect(`/routing/${pages.length ? pages.join("/") : ""}`);
};

export default Page;
