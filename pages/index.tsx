import { useRouter } from "next/router";

import Loader from "@components/Loader";

function RedirectPage() {
  const router = useRouter();
  if (typeof window !== "undefined") {
    router.push("/event-types");
    return;
  }
  return <Loader />;
}

RedirectPage.getInitialProps = (ctx) => {
  if (ctx.res) {
    ctx.res.writeHead(302, { Location: "/event-types" });
    ctx.res.end();
  }
  return {};
};

export default RedirectPage;
