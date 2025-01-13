import Custom404 from "@components/error/404-page";

const CustomError = () => {
  return <Custom404 />;
};

export default CustomError;

// `pages/_error` needs to exist until all routes are
// fully migrated to App Router. Dynamic routes in Pages Router
// like `/[user]/[type]` or `/team/[slug]` cannot use App Router's
// error handling
