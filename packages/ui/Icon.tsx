// find all feather icons at https://feathericons.com/
// github https://github.com/feathericons/feather
export * as Icon from "react-icons/fi";

// if feather icon is missing, use "@heroicons/react/outline";
export { CollectionIcon } from "@heroicons/react/outline";
export { ShieldCheckIcon } from "@heroicons/react/outline";
export { BadgeCheckIcon } from "@heroicons/react/outline";
export { ClipboardCopyIcon } from "@heroicons/react/outline";

// TODO:
// right now: Icon.Sun comes from react-feather
// CollectionIcon comes from "@heroicons/react/outline";

// I want:
// export CollectionIcon as Icon.Collection
// so I can
// import { Icon } from "@calcom/ui/Icon";
