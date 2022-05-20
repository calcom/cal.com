import FormBuilder from "./create-form";
import RoutingForm from "./form";

function parsePage(page) {
  if (page.length > 2) {
    console.error("Only 2 level of pages are supported");
    return {
      notFound: true,
    };
  }
  const mainPage = page[0];
  const subPage = page[1];
  if (mainPage === "form") {
    return {
      mainPage: "form",
      id: subPage,
    };
  } else if (mainPage === "create-form") {
    if (subPage) {
      return {
        notFound: true,
      };
    }
    return {
      mainPage: "create-form",
    };
  }
  return {
    notFound: true,
  };
}

export default function RoutingFormAppPage({ page }) {
  const { notFound, mainPage, subPage } = parsePage(page);
  if (notFound) {
    return <div>404</div>;
  }
  if (mainPage === "form") {
    return <RoutingForm subPage={subPage}></RoutingForm>;
  } else if (mainPage === "create-form") {
    return <FormBuilder></FormBuilder>;
  }
}
