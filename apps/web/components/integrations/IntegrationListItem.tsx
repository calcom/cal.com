import Image from "next/image";
import { ReactNode } from "react";

import classNames from "@lib/classNames";

import { ListItem, ListItemText, ListItemTitle } from "@components/List";

function IntegrationListItem(props: {
  imageSrc: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
}): JSX.Element {
  return (
    <ListItem expanded={!!props.children} className={classNames("flex-col")}>
      <div className={classNames("flex w-full flex-1 items-center space-x-2 p-3 rtl:space-x-reverse")}>
        <Image width={40} height={40} src={`/${props.imageSrc}`} alt={props.title} />
        <div className="flex-grow truncate pl-2">
          <ListItemTitle component="h3">{props.title}</ListItemTitle>
          <ListItemText component="p">{props.description}</ListItemText>
        </div>
        <div>{props.actions}</div>
      </div>
      {props.children && <div className="w-full border-t border-gray-200">{props.children}</div>}
    </ListItem>
  );
}

export default IntegrationListItem;
