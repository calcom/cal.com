import { useTranslation } from "next-i18next";
import { useRouter } from "next/router";

interface Props {
  localeProp: string;
}

const I18nLanguageHandler = ({ localeProp }: Props): null => {
  const { i18n } = useTranslation("common");
  const router = useRouter();
  const { pathname } = router;
  if (!localeProp)
    console.warn(
      `You may forgot to return 'localeProp' from 'getServerSideProps' or 'getStaticProps' in ${pathname}`
    );
  if (i18n.language !== localeProp) {
    i18n.changeLanguage(localeProp);
  }
  return null;
};

export default I18nLanguageHandler;
