import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui";

export const TeamFeatures = () => {
  const { t } = useLocale();
  const features = [
    {
      icon: <Icon.FiUsers className="h-5 w-5 text-red-500" />,
      title: t("collective_scheduling"),
      description: t("make_it_easy_to_book"),
    },
    {
      icon: <Icon.FiRefreshCcw className="h-5 w-5 text-blue-500" />,
      title: t("round_robin"),
      description: t("find_the_best_person"),
    },
    {
      icon: <Icon.FiUserPlus className="h-5 w-5 text-green-500" />,
      title: t("fixed_round_robin"),
      description: t("add_one_fixed_attendee"),
    },
    {
      icon: <Icon.FiMail className="h-5 w-5 text-orange-500" />,
      title: t("sms_attendee_action"),
      description: t("make_it_easy_to_book"),
    },
    {
      icon: <Icon.FiVideo className="h-5 w-5 text-purple-500" />,
      title: "Cal Video" + " " + t("recordings_title"),
      description: t("upgrade_to_access_recordings_description"),
    },
    {
      icon: <Icon.FiEyeOff className="h-5 w-5 text-indigo-500" />,
      title: t("disable_cal_branding", { appName: APP_NAME }),
      description: t("disable_cal_branding_description", { appName: APP_NAME }),
    },
  ];
  return (
    <div className="grid-cols-3 md:grid md:gap-4">
      {features.map((feature) => (
        <div key={feature.title} className="mb-4 min-h-[180px] w-full rounded-md bg-gray-50 p-8 md:mb-0">
          {feature.icon}
          <h2 className="font-cal mt-4 text-lg">{feature.title}</h2>
          <p className="text-gray-700">{feature.description}</p>
        </div>
      ))}
    </div>
  );
};
