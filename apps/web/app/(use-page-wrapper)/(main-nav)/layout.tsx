import Shell from "@calcom/features/shell/Shell";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <Shell withoutMain={true}>{children}</Shell>;
};

export default Layout;
