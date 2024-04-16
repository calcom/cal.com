import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen, Avatar } from "@calcom/ui";

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
        avatar={
          <Avatar
            alt={slug ?? ""}
            imageSrc={props.orgSlug ? `/org/${slug}/avatar.png` : `/team/${slug}/avatar.png`}
            size="lg"
          />
        }
        headline={t("team_is_unpublished", {
          team: props.name,
        })}
        description={t(`${props.orgSlug ? "org" : "team"}_is_unpublished_description`)}
      />
    </div>
  );
}
