import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";

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
};

export function UnpublishedEntity(props: UnpublishedEntityProps) {
  const { t } = useLocale();
  const slug = props.orgSlug || props.teamSlug;
  return (
    <div className="m-8 flex items-center justify-center">
      <EmptyScreen
        avatar={<Avatar alt={slug ?? ""} imageSrc={getPlaceholderAvatar(props.logoUrl, slug)} size="lg" />}
        // Replace HTML entity for apostrophe (&#39;) with the actual character (')
        // This is needed because React automatically escapes special characters like apostrophes
        // for security (XSS prevention), but we want to display the actual apostrophe in the UI
        headline={t("team_is_unpublished", {
          team: props.name,
        }).replace("&#39;", "'")}
        description={t(`${props.orgSlug ? "org" : "team"}_is_unpublished_description`)}
      />
    </div>
  );
}
