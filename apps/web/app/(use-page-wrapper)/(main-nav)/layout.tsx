import Shell from "@calcom/features/shell/Shell";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Shell hideHeadingOnMobile withoutSeo={true} withoutMain={true}>
      {children}
    </Shell>
  );
};

export default Layout;
