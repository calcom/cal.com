import process from "node:process";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { z } from "zod";
import VerifyPage from "~/auth/verify-view";

const querySchema = z.object({
  stripeCustomerId: z.string().optional(),
  sessionId: z.string().optional(),
  t: z.string().optional(),
});

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const p = { ...(await params), ...(await searchParams) };
  const { sessionId } = querySchema.parse(p);

  return await _generateMetadata(
    () => (sessionId ? "Payment Page" : `Verify your email`),
    () => "",
    undefined,
    undefined,
    "/auth/verify"
  );
};

const ServerPage = () => {
  return <VerifyPage EMAIL_FROM={process.env.EMAIL_FROM} />;
};

export default ServerPage;
