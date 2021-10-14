import fs from "fs";
import { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import path from "path";

import { inferSSRProps } from "@lib/types/inferSSRProps";

async function _getStaticProps() {
  const dir = path.join(process.cwd(), "pages", "sandbox");

  const pages = fs
    .readdirSync(dir)
    .filter((file) => !file.startsWith("."))
    .map((file) => {
      const parts = file.split(".");
      // remove extension
      parts.pop();
      return parts.join(".");
    });
  return {
    props: {
      pages,
    },
  };
}
type PageProps = inferSSRProps<typeof _getStaticProps>;

const SandboxPage: NextPage<PageProps> = (props) => {
  return (
    <>
      <Head>
        <meta name="googlebot" content="noindex" />
      </Head>
      <nav>
        <ul className="flex justify-between flex-col md:flex-row">
          {props.pages.map((pathname) => (
            <li key={pathname}>
              <Link href={"/sandbox/" + pathname + "#main"}>
                <a className="font-mono px-4">{pathname}</a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main id="main" className="bg-gray-100">
        {props.children}
      </main>
    </>
  );
};
export function sandboxPage(Component: NextPage) {
  const Wrapper: NextPage<PageProps> = (props) => {
    return (
      <>
        <SandboxPage {...props}>
          <Component />
        </SandboxPage>
      </>
    );
  };
  return {
    default: Wrapper,
    getStaticProps: _getStaticProps,
  };
}

const page = sandboxPage(() => {
  return <p className="text-center text-2xl my-20">Click a component above</p>;
});

export default page.default;
export const getStaticProps = page.getStaticProps;
