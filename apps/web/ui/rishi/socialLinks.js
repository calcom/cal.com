import {
  Link as LinkIcon,
  At,
  TwitterLogo,
  GithubLogo,
  Rss,
  LinkedinLogo,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { cleanLink } from "@ui/utilities/utils";

import { Button } from "@calcom/ui";

const getIcon = ({ forId }) => {
  switch (forId) {
    case "website":
      return <LinkIcon />;
    case "email":
      return <At />;
    case "twitter":
      return <TwitterLogo />;
    case "github":
      return <GithubLogo />;
    case "linkedin":
      return <LinkedinLogo />;
    case "rss":
      return <Rss />;
    case "youtube":
      return <YoutubeLogo />;
    default:
      return <LinkIcon />;
  }
};

const SocialLinks = ({ data }) => {
  return (
    <div id="social">
      <h3 className="mb-2 text-sm font-medium opacity-50">Social Links</h3>
      <div className="flex flex-wrap gap-2">
        {Object.values(data)?.map(({ key, url }) =>
          url ? (
            <Button
              className="rounded-lg px-[7px] py-[2px] text-sm shadow-[0_0_4px_rgba(0,0,0,0.05)]"
              key={key}
              variant="secondary"
              as="a"
              href={url}
              target="_blank">
              <span className="mr-1">{getIcon({ forId: key })}</span>
              {cleanLink(url)}
            </Button>
          ) : (
            ""
          )
        )}
      </div>
    </div>
  );
};

export default SocialLinks;
