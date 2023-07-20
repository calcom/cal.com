import { getCurrentOrg, getTeams, getUserForTabs } from "app/(settings)/settings/fetchers";
import React from "react";

import { SettingsSidebarContainer } from "@components/settings/sidebar/SettingsSidebarContainer";

// Importing here - would go top level layout but we are only using settings layout for now.
import "../../../styles/globals.css";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const [currentOrg, teams, user] = await Promise.all([getCurrentOrg(), getTeams(), getUserForTabs()]);

  // useEffect(() => {
  //   const closeSideContainer = () => {
  //     if (window.innerWidth >= 1024) {
  //       setSideContainerOpen(false);
  //     }
  //   };

  //   window.addEventListener("resize", closeSideContainer);
  //   return () => {
  //     window.removeEventListener("resize", closeSideContainer);
  //   };
  // }, [setSideContainerOpen]);

  // useEffect(() => {
  //   if (sideContainerOpen) {
  //     setSideContainerOpen(!sideContainerOpen);
  //   }
  // }, [setSideContainerOpen, sideContainerOpen]);

  return (
    <div className="desktop-transparent bg-subtle flex min-h-screen flex-col font-sans antialiased">
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1" data-testid="dashboard-shell">
          <SettingsSidebarContainer
            currentOrg={currentOrg}
            teams={teams}
            identityProvider={user.identityProvider}
          />
          <div className="flex w-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
    </div>
    // <Shell
    //   withoutSeo={true}
    //   flexChildrenContainer
    //   hideHeadingOnMobile
    //   {...rest}
    //   SidebarContainer={
    //     <>
    //       {/* Mobile backdrop */}
    //       {sideContainerOpen && (
    //         <button
    //           onClick={() => setSideContainerOpen(false)}
    //           className="fixed left-0 top-0 z-10 h-full w-full bg-black/50">
    //           <span className="sr-only">{t("hide_navigation")}</span>
    //         </button>
    //       )}
    //       <Suspense fallback={<h1>loading</h1>}>
    //         <SettingsSidebarContainer navigationIsOpenedOnMobile={sideContainerOpen} />
    //       </Suspense>
    //     </>
    //   }
    //   drawerState={state}
    //   MobileNavigationContainer={null}
    //   TopNavContainer={
    //     <MobileSettingsContainer onSideContainerOpen={() => setSideContainerOpen(!sideContainerOpen)} />
    //   }>
    //   <div className="flex flex-1 [&>*]:flex-1">
    //     <div className="mx-auto max-w-full justify-center md:max-w-3xl">
    //       <ShellHeader />
    //       <ErrorBoundary>
    //         <Suspense fallback={<Loader />}>{children}</Suspense>
    //       </ErrorBoundary>
    //     </div>
    //   </div>
    // </Shell>
  );
}

// function ShellHeader() {
//   const { meta } = useMeta();
//   const { t, isLocaleReady } = useLocale();
//   return (
//     <header className="mx-auto block justify-between pt-8 sm:flex">
//       <div className="border-subtle mb-8 flex w-full items-center border-b pb-6">
//         {meta.backButton && (
//           <a href="javascript:history.back()">
//             <ArrowLeft className="mr-7" />
//           </a>
//         )}
//         <div>
//           {meta.title && isLocaleReady ? (
//             <h1 className="font-cal text-emphasis mb-1 text-xl font-bold leading-5 tracking-wide">
//               {t(meta.title)}
//             </h1>
//           ) : (
//             <div className="bg-emphasis mb-1 h-5 w-24 animate-pulse rounded-md" />
//           )}
//           {meta.description && isLocaleReady ? (
//             <p className="text-default text-sm ltr:mr-4 rtl:ml-4">{t(meta.description)}</p>
//           ) : (
//             <div className="bg-emphasis h-5 w-32 animate-pulse rounded-md" />
//           )}
//         </div>
//         <div className="ms-auto flex-shrink-0">{meta.CTA}</div>
//       </div>
//     </header>
//   );
// }
