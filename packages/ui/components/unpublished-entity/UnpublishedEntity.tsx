import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";

import { Avatar } from "../avatar/Avatar";
import { EmptyScreen } from "../empty-screen/EmptyScreen";

export type UnpublishedEntityProps = {
  /**
   * If it is passed, don't pass orgSlug
   * It conveys two things - Slug for the team and that it is not an organization
   */
  teamSlug?: string | null;
  /**
   * If it is passed, don't pass teamSlug.
   * It conveys two things - Slug for the team and that it is an organization infact
   */
  orgSlug?: string | null;
  /* logo url for entity */
  logoUrl?: string | null;
  /**
   * Team or Organization name
   */
  name?: string | null;
  /**
   * Translations map
   */
  translations: Record<string, string>;
};

export function UnpublishedEntity(props: UnpublishedEntityProps) {
  const slug = props.orgSlug || props.teamSlug;
  return (
    <div className="m-8 flex items-center justify-center">
      <EmptyScreen
        avatar={<Avatar alt={slug ?? ""} imageSrc={getPlaceholderAvatar(props.logoUrl, slug)} size="lg" />}
        headline={
          props.translations["team_is_unpublished"]
            ? props.translations["team_is_unpublished"].replace("{team}", props.name || "")
            : `${props.name} is unpublished`
        }
        description={
          props.translations[`${props.orgSlug ? "org" : "team"}_is_unpublished_description`] ||
          `This ${props.orgSlug ? "organization" : "team"} is not published.`
        }
      />
    </div>
  );
}
