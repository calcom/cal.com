import {
  DueInvoiceBanner,
  type DueInvoiceBannerProps,
} from "@calcom/web/modules/ee/billing/components/DueInvoiceBanner";
import ImpersonatingBanner, {
  type ImpersonatingBannerProps,
} from "@calcom/web/modules/ee/impersonation/components/ImpersonatingBanner";
import {
  OrgUpgradeBanner,
  type OrgUpgradeBannerProps,
} from "@calcom/web/modules/ee/organizations/components/OrgUpgradeBanner";
import {
  TeamsUpgradeBanner,
  type TeamsUpgradeBannerProps,
} from "@calcom/web/modules/ee/teams/components/TeamsUpgradeBanner";
import AdminPasswordBanner, {
  type AdminPasswordBannerProps,
} from "@calcom/web/modules/users/components/AdminPasswordBanner";
import CalendarCredentialBanner, {
  type CalendarCredentialBannerProps,
} from "@calcom/web/modules/users/components/CalendarCredentialBanner";
import {
  InvalidAppCredentialBanners,
  type InvalidAppCredentialBannersProps,
} from "@calcom/web/modules/users/components/InvalidAppCredentialsBanner";
import VerifyEmailBanner, {
  type VerifyEmailBannerProps,
} from "@calcom/web/modules/users/components/VerifyEmailBanner";

type BannerTypeProps = {
  teamUpgradeBanner: TeamsUpgradeBannerProps;
  orgUpgradeBanner: OrgUpgradeBannerProps;
  verifyEmailBanner: VerifyEmailBannerProps;
  adminPasswordBanner: AdminPasswordBannerProps;
  impersonationBanner: ImpersonatingBannerProps;
  calendarCredentialBanner: CalendarCredentialBannerProps;
  invalidAppCredentialBanners: InvalidAppCredentialBannersProps;
  dueInvoiceBanner: DueInvoiceBannerProps;
};

type BannerType = keyof BannerTypeProps;

type BannerComponent = {
  [Key in BannerType]: (props: BannerTypeProps[Key]) => JSX.Element;
};

export type AllBannerProps = { [Key in BannerType]: BannerTypeProps[Key]["data"] };

export const BannerComponent: BannerComponent = {
  teamUpgradeBanner: (props: TeamsUpgradeBannerProps) => <TeamsUpgradeBanner {...props} />,
  orgUpgradeBanner: (props: OrgUpgradeBannerProps) => <OrgUpgradeBanner {...props} />,
  verifyEmailBanner: (props: VerifyEmailBannerProps) => <VerifyEmailBanner {...props} />,
  adminPasswordBanner: (props: AdminPasswordBannerProps) => <AdminPasswordBanner {...props} />,
  impersonationBanner: (props: ImpersonatingBannerProps) => <ImpersonatingBanner {...props} />,
  calendarCredentialBanner: (props: CalendarCredentialBannerProps) => <CalendarCredentialBanner {...props} />,
  invalidAppCredentialBanners: (props: InvalidAppCredentialBannersProps) => (
    <InvalidAppCredentialBanners {...props} />
  ),
  dueInvoiceBanner: (props: DueInvoiceBannerProps) => <DueInvoiceBanner {...props} />,
};

interface BannerContainerProps {
  banners: AllBannerProps;
}

export const BannerContainer: React.FC<BannerContainerProps> = ({ banners }) => {
  return (
    <div className="sticky top-0 z-10 w-full divide-y divide-black">
      {Object.keys(banners).map((key) => {
        if (key === "teamUpgradeBanner") {
          const Banner = BannerComponent[key];
          return <Banner data={banners[key]} key={key} />;
        } else if (key === "orgUpgradeBanner") {
          const Banner = BannerComponent[key];
          return <Banner data={banners[key]} key={key} />;
        } else if (key === "verifyEmailBanner") {
          const Banner = BannerComponent[key];
          return <Banner data={banners[key]} key={key} />;
        } else if (key === "adminPasswordBanner") {
          const Banner = BannerComponent[key];
          return <Banner data={banners[key]} key={key} />;
        } else if (key === "impersonationBanner") {
          const Banner = BannerComponent[key];
          return <Banner data={banners[key]} key={key} />;
        } else if (key === "calendarCredentialBanner") {
          const Banner = BannerComponent[key];
          return <Banner data={banners[key]} key={key} />;
        } else if (key === "invalidAppCredentialBanners") {
          const Banner = BannerComponent[key];
          return <Banner data={banners[key]} key={key} />;
        } else if (key === "dueInvoiceBanner") {
          const Banner = BannerComponent[key];
          return <Banner data={banners[key]} key={key} />;
        }
      })}
    </div>
  );
};
