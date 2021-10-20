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
      <div className={classNames("flex flex-1 space-x-2 w-full p-3 items-center")}>
        <Image width={40} height={40} src={`/${props.imageSrc}`} alt={props.title} />
        <div className="flex-grow pl-2 truncate">
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
