import RoutingForm from "../components/form";

export default function RoutingLink({ subPages, Page404 }) {
  if (!subPages.length) {
    return <Page404></Page404>;
  }
  return <RoutingForm formId={subPages[0]}></RoutingForm>;
}
