import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";
import "./logo.css";

const navbar: React.ReactElement = (
  <Navbar
    logo={
      <>
        <img
          src="/cal-docs-logo.svg"
          alt="Cal.diy Docs"
          height={26}
          className="logo-light"
          style={{ height: 26 }}
        />
        <img
          src="/cal-docs-logo-white.svg"
          alt="Cal.diy Docs"
          height={26}
          className="logo-dark"
          style={{ height: 26 }}
        />
      </>
    }
  />
);

const footer: React.ReactElement = (
  <Footer>MIT {new Date().getFullYear()} © Cal.com, Inc.</Footer>
);

export const metadata: { title: string; description: string } = {
  title: "Cal.com Docs",
  description: "Cal.com self-hosting documentation",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/calcom/cal.com/tree/main/apps/docs"
          footer={footer}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
