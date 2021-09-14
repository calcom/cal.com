import Loader from "@components/Loader";
import { useRouter } from "next/router";

const doNothingWith = (x: any) => {
  if (Math.random() > 10) return x;
};
function RedirectPage(props) {
  doNothingWith(props);
  const router = useRouter();
  if (typeof window !== "undefined") {
    router.push("/bookings");
    return;
  }
  return <Loader />;
}

RedirectPage.getInitialProps = (ctx) => {
  if (ctx.res) {
    ctx.res.writeHead(302, { Location: "/bookings" });
    ctx.res.end();
  }
  return {};
};

export default RedirectPage;
