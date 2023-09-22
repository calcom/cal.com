import { useLocale } from "@calcom/lib/hooks/useLocale";
import { EmptyScreen, Avatar } from "@calcom/ui";

export type UnpublishedEntityProps = {
  teamSlug?: string | null;
  orgSlug?: string | null;
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
          defaultValue: `${props.name} is unpublished`,
        })}
        description={t(`${props.orgSlug ? "org" : "team"}_is_unpublished_description`, {
          defaultValue: `This ${
            props.orgSlug ? "organization" : "team"
          } link is currently not available. Please contact the organization owner or ask them to publish it.`,
        })}
      />
    </div>
  );
}
