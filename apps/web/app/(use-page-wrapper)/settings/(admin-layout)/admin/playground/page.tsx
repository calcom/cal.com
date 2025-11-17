import Link from "next/link";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata, getTranslate } from "app/_utils";
import { Table } from "@calcom/ui/components/table";

const LINKS = [
  {
    title: "Routing Funnel",
    href: "/settings/admin/playground/routing-funnel",
  },
  {
    title: "Bookings by Hour",
    href: "/settings/admin/playground/bookings-by-hour",
  },
  {
    title: "Weekly Calendar",
    href: "/settings/admin/playground/weekly-calendar",
  },
];

const { Cell, Header, Row, ColumnTitle } = Table;

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("playground"),
    (t) => t("admin_playground_description"),
    undefined,
    undefined,
    "/settings/admin/playground"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader
      title={t("playground")}
      description={t("admin_playground_description")}
    >
      <Table>
        <Header>
          <ColumnTitle widthClassNames="w-auto">Feature</ColumnTitle>
        </Header>
        {LINKS.map((link) => (
          <Row key={link.title}>
            <Cell widthClassNames="w-auto">
              <Link href={link.href} className="font-medium">
              {link.title}
            </Link>
            </Cell>
          </Row>
        ))}
      </Table>
        
    </SettingsHeader>
  );
}

export default Page;
