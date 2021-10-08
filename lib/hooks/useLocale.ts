import { useTranslation } from "next-i18next";

type LocaleProp = {
  localeProp: string;
};

export const useLocale = (props: LocaleProp) => {
  const { i18n, t } = useTranslation("common");

  if (i18n.language !== props.localeProp) {
    i18n.changeLanguage(props.localeProp);
  }

  return {
    i18n,
    locale: props.localeProp,
    t,
  };
};
