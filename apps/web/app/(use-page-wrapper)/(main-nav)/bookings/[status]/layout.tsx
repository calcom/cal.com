import { _generateMetadata } from "app/_utils";

export const generateMetadata = async ({ params }: { params: Promise<{ status: string }> }) =>
  await _generateMetadata(
    (t) => t("bookings"),
    (t) => t("bookings_description"),
    undefined,
    undefined,
    `/bookings/${(await params).status}`
  );

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
