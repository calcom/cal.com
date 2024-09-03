"use client";

import { useState } from "react";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, EmptyScreen, Meta, SkeletonContainer, SkeletonText } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import CreatePasskeyDialog from "@components/settings/CreatePasskeyModal";
import PasskeyDataTable from "@components/settings/PasskeyDataTable";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} borderInShellHeader={true} />
      <div className="divide-subtle border-subtle space-y-6 rounded-b-lg border border-t-0 px-6 py-4">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};

const PasskeyView = () => {
  const [createPasskeyDialogOpen, setCreatePasskeyDialogOpen] = useState(false);
  const { t } = useLocale();

  const { data: passkeys, isPending } = trpc.viewer.passkey.find.useQuery();

  const AddPasskeyButton = () => {
    return (
      <Button color="secondary" StartIcon="plus" onClick={() => setCreatePasskeyDialogOpen(true)}>
        {t("add")}
      </Button>
    );
  };

  if (isPending) {
    return <SkeletonLoader title={t("passkeys")} description={t("register_first_passkey_description")} />;
  }

  return (
    <>
      <Meta title={t("passkeys")} description={t("passkeys_description")} CTA={<AddPasskeyButton />} />
      {!!passkeys && passkeys.length > 0 ? (
        <PasskeyDataTable passkeys={passkeys} />
      ) : (
        <EmptyScreen
          customIcon={
            <div className="bg-emphasis mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full">
              <img src="/passkey.svg" alt="passkey" className="text-subtle h-8 w-8 dark:invert" />
            </div>
          }
          headline={t("register_first_passkey")}
          description={t("register_first_passkey_description")}
          className="rounded-lg"
          buttonRaw={<AddPasskeyButton />}
        />
      )}

      <CreatePasskeyDialog open={createPasskeyDialogOpen} setOpen={setCreatePasskeyDialogOpen} />
    </>
  );
};

PasskeyView.getLayout = getLayout;
PasskeyView.PageWrapper = PageWrapper;

export default PasskeyView;
