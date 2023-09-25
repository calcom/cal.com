import clsx from "clsx";

const Container = ({ children, className, width }) => {
  return (
    <section style={{ maxWidth: width || "100%" }} className={clsx("mx-auto w-full px-4 md:px-6", className)}>
      {children}
    </section>
  );
};

export default Container;
