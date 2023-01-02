import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon, ListItem, ListItemText, ListItemTitle, showToast } from "@calcom/ui";

import classNames from "@lib/classNames";

function IntegrationListItem(props: {
  imageSrc?: string;
  slug: string;
  name?: string;
  title?: string;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
  logo: string;
  destination?: boolean;
  separate?: boolean;
  invalidCredential?: boolean;
}): JSX.Element {
  const { t } = useLocale();
  const router = useRouter();
  const { hl } = router.query;
  const [highlight, setHighlight] = useState(hl === props.slug);
  const title = props.name || props.title;

  // The highlight is to show a newly installed app, coming from the app's
  // redirection after installation, so we proceed to show the corresponding
  // message
  if (highlight) {
    showToast(t("app_successfully_installed"), "success");
  }

  useEffect(() => {
    const timer = setTimeout(() => setHighlight(false), 3000);
    return () => {
      clearTimeout(timer);
    };
  }, []);
  return (
    <ListItem
      expanded={!!props.children}
      className={classNames(
        props.separate ? "rounded-md" : "first:rounded-t-md last:rounded-b-md",
        "my-0 flex-col border transition-colors duration-500",
        highlight ? "bg-yellow-100" : ""
      )}>
      <div className={classNames("flex w-full flex-1 items-center space-x-2 p-4 rtl:space-x-reverse")}>
        {props.logo && <img className="h-11 w-11" src={props.logo} alt={title} />}
        <div className="flex-grow truncate pl-2">
          <ListItemTitle component="h3">
            <Link href={"/apps/" + props.slug}>{props.name || title}</Link>
          </ListItemTitle>
          <ListItemText component="p">{props.description}</ListItemText>
          {/* Alert error that key stopped working. */}
          {props.invalidCredential && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Icon.FiAlertCircle className="w-8 text-red-500 sm:w-4" />
              <ListItemText component="p" className="whitespace-pre-wrap text-red-500">
                {t("invalid_credential")}
              </ListItemText>
            </div>
          )}
        </div>
        <div>{props.actions}</div>
      </div>
      {props.children && <div className="w-full">{props.children}</div>}
    </ListItem>
  );
}

export default IntegrationListItem;
