import { useTranslation } from "react-i18next";

interface Props {
  localeProp: string;
}

const I18nLanguageHandler = ({ localeProp }: Props): null => {
  const { i18n } = useTranslation("common");
  if (i18n.language !== localeProp) {
    i18n.changeLanguage(localeProp);
  }
  return null;
};

export default I18nLanguageHandler;
