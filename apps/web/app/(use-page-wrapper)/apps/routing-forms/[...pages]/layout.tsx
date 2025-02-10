import Shell from "@calcom/features/shell/Shell";

const ServerPage = async ({ children }: { children: React.ReactNode }) => {
  return (
    <Shell withoutMain withoutSeo>
      {children}
    </Shell>
  );
};

export default ServerPage;
