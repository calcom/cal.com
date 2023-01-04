// if feather icon is missing, use "@heroicons/react/outline";
import { CollectionIcon } from "@heroicons/react/outline";
import { ShieldCheckIcon } from "@heroicons/react/outline";
import { BadgeCheckIcon } from "@heroicons/react/outline";
import { ClipboardCopyIcon } from "@heroicons/react/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/solid";
// find all feather icons at https://feathericons.com/
// github https://github.com/feathericons/feather
import * as ReactIcons from "react-icons/fi";

export const Icon = {
  ...ReactIcons,
  CollectionIcon,
  ShieldCheckIcon,
  BadgeCheckIcon,
  ClipboardCopyIcon,
  StarIconSolid,
};
