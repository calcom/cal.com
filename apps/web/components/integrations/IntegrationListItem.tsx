import Link from "next/link";
import { ReactNode } from "react";

import { ListItem, ListItemText, ListItemTitle } from "@calcom/ui/List";

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
}): JSX.Element {
  const title = props.name || props.title;
  return (
    <ListItem expanded={!!props.children} className={classNames("flex-col")}>
      <div className={classNames("flex w-full flex-1 items-center space-x-2 p-3 rtl:space-x-reverse")}>
        {
          // eslint-disable-next-line @next/next/no-img-element
          props.logo && <img className="h-10 w-10" src={props.logo} alt={title} />
        }
        <div className="flex-grow truncate pl-2">
          <ListItemTitle component="h3">
            <Link href={"/apps/" + props.slug}>{props.name || title}</Link>
          </ListItemTitle>
          <ListItemText component="p">{props.description}</ListItemText>
        </div>
        <div>{props.actions}</div>
      </div>
      {props.children && <div className="w-full border-t border-gray-200">{props.children}</div>}
    </ListItem>
  );
}

export default IntegrationListItem;
