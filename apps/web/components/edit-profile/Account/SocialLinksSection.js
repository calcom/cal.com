import { Input } from "@calcom/ui";

import FormBlock from "./FormBlock";

const SocialLinksSection = ({ socialLinks, profile, handleSocialInput }) => {
  return (
    <FormBlock title="Social Information" description="Where you can be found on the internet.">
      <div className="grid grid-cols-2 gap-8">
        {socialLinks.map((socialLink) => (
          <div key={socialLink.key} className="">
            <Input
              type="url"
              name={socialLink.key}
              label={`${socialLink.name} URL`}
              value={profile.social_links.find((link) => link.key === socialLink.key).url}
              Icon={socialLink.icon}
              onChange={(e) => handleSocialInput(e, socialLink.key)}
            />
          </div>
        ))}
      </div>
    </FormBlock>
  );
};

export default SocialLinksSection;
