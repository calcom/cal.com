import FormBlock from "components/Account/FormBlock";
import React from "react";
import Button from "ui/fayaz/Button";
import Input from "ui/fayaz/input";

const OtherLinksSection = ({ profile, setProfile, addOtherLink }) => {
  return (
    <FormBlock
      title="Other Links"
      description="Add some other links which are important to you, like your blog, portfolio, etc or anything that makes you proud.">
      <div className="space-y-8 divide-y">
        {profile.other_links.map((link, i) => (
          <div key={i} className="space-y-4 pt-4">
            <div className="sm:col-span-3">
              <Input
                label="Name"
                value={link.name}
                onChange={(e) => {
                  const newLinks = [...profile.other_links];
                  newLinks[i].name = e.target.value;
                  setProfile({ ...profile, other_links: newLinks });
                }}
              />
            </div>
            <div className="sm:col-span-3">
              <Input
                label="URL"
                type="url"
                value={link.url}
                onChange={(e) => {
                  const newLinks = [...profile.other_links];
                  newLinks[i].url = e.target.value;
                  setProfile({ ...profile, other_links: newLinks });
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="col-span-full mt-4">
        <Button onClick={addOtherLink} type="button" size="sm" label="Add link +" />
      </div>
    </FormBlock>
  );
};

export default OtherLinksSection;
