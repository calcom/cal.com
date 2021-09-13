import dayjs from "dayjs";

export const ONBOARDING_INTRODUCED_AT = dayjs("September 1 2021").toISOString();

export const ONBOARDING_NEXT_REDIRECT = {
  redirect: {
    permanent: false,
    destination: "/getting-started",
  },
} as const;

export const shouldShowOnboarding = ({
  completedOnboarding,
  createdDate,
}: {
  completedOnboarding: boolean;
  createdDate: dayjs.ConfigType;
}) => {
  return !completedOnboarding && dayjs(createdDate).isAfter(ONBOARDING_INTRODUCED_AT);
};
