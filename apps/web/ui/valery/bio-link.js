import Link from "next/link";
import {
  Facebook,
  Github,
  Instagram,
  Link45deg,
  Linkedin,
  Mastodon,
  Medium,
  Quora,
  Reddit,
  StackOverflow,
  Telegram,
  Twitch,
  Twitter,
  Youtube,
  Wikipedia,
} from "react-bootstrap-icons";

import { Keybase, GoogleScholar } from "../../ui/icons/social";

const linkTypes = [
  {
    type: "generic_link",
    label: "Custom",
    icon: Link45deg,
  },
  {
    type: "twitter",
    label: "Twitter",
    icon: Twitter,
  },
  {
    type: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
  },
  {
    type: "github",
    label: "GitHub",
    icon: Github,
  },
  {
    type: "stackexchange",
    label: "Stack Exchange",
    icon: StackOverflow,
  },
  { type: "wikipedia", label: "Wikipedia", icon: Wikipedia },
  {
    type: "google-scholar",
    label: "Google scholar",
    icon: GoogleScholar,
  },
  {
    type: "youtube",
    label: "YouTube",
    icon: Youtube,
  },
  {
    type: "facebook",
    label: "Facebook",
    icon: Facebook,
  },
  {
    type: "instagram",
    label: "Instagram",
    icon: Instagram,
  },
  {
    type: "medium",
    label: "Medium",
    icon: Medium,
  },
  {
    type: "quora",
    label: "Quora",
    icon: Quora,
  },
  {
    type: "reddit",
    label: "Reddit",
    icon: Reddit,
  },
  {
    type: "twitch",
    label: "Twitch",
    icon: Twitch,
  },
  {
    type: "telegram",
    label: "Telegram",
    icon: Telegram,
  },
  {
    type: "mastodon",
    label: "Mastodon",
    icon: Mastodon,
  },
  {
    type: "keybase",
    label: "Keybase",
    icon: Keybase,
  },
];

// Strip protocol from URL
const stripProtocol = (url) => url.replace(/(^\w+:|^)\/\//, "");

// Link type to icon mapping

const iconProps = {
  size: 16,
  className: "shrink-0 text-gray-400 group-hover:text-gray-500",
};

const linkTypeToIcon = (type) => {
  const IconComponent = linkTypes.find((link) => link.type === type)?.icon;
  return IconComponent ? <IconComponent {...iconProps} /> : null;
};

// TODO: Add tooltip for icon links
const BioLink = ({ type, url, name }) => (
  <Link
    href={url}
    target="_blank"
    className="group flex flex-row items-center gap-1 text-gray-600 decoration-gray-300 underline-offset-4 hover:text-gray-700 hover:underline"
    title={type !== "generic_link" && type !== "website" && name}
    id={`link-${type}`}>
    <div className="flex h-6 flex-shrink-0 items-center justify-center">
      {linkTypeToIcon(type) ?? <Link45deg {...iconProps} />}
    </div>
    {(type === "generic_link" || type === "website") && (
      <div className="whitespace-nowrap text-[13px] leading-6 tracking-[0.26]">
        {name ? name : stripProtocol(url)}
      </div>
    )}
  </Link>
);

export default BioLink;
