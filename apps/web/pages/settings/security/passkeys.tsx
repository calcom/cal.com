import { create } from "@github/webauthn-json";
import { useMutation, useQuery } from "@tanstack/react-query";

import dayjs from "@calcom/dayjs";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { classNames } from "@calcom/lib";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyScreen,
  Meta,
  SkeletonContainer,
  SkeletonText,
  showToast,
} from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import PasskeyIcon from "@components/auth/PasskeyIcon";

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

interface Passkey {
  id: string;
  name?: string;
  createdAt: string;
  lastUsedAt?: string;
}

const PasskeyListItem = (props: Passkey & { onRemoved?: () => void }) => {
  const { t } = useLocale();

  const remove = useMutation({
    mutationFn: () =>
      fetch("/api/auth/passkeys/remove", {
        method: "DELETE",
        body: JSON.stringify({ credentialId: props.id }),
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json()),
    onSuccess: props.onRemoved,
    onError: (e: any) => {
      showToast(e.message || t("something_went_wrong"), "error");
    },
  });

  return (
    <div
      className={classNames(
        "flex w-full justify-between px-4 py-4 sm:px-6"
        //   lastItem ? "" : "border-subtle border-b"
      )}>
      <div>
        <div className="flex gap-1">
          <p className="text-sm font-semibold">{props.name}</p>
        </div>
        <div className="mt-1 flex items-center space-x-3.5">
          <p className="text-default text-sm">
            {t("passkey_created", { when: dayjs(props?.createdAt).fromNow() })}
            {
              // We also check for lastUsedAt != createdAt because new passkeys' lastUsedAt is set to createdAt
              props.lastUsedAt && props.lastUsedAt !== props.createdAt && (
                <>&nbsp;&bull; {t("passkey_last_used", { when: dayjs(props.lastUsedAt).fromNow() })}</>
              )
            }
          </p>
        </div>
      </div>
      <div>
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="icon" color="secondary" StartIcon="ellipsis" />
          </DropdownMenuTrigger>

          <DropdownMenuContent>
            <DropdownMenuItem>
              <DropdownItem
                type="button"
                color="destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
                StartIcon="trash">
                {t("delete") as string}
              </DropdownItem>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </Dropdown>
      </div>
    </div>
  );
};

async function registerPasskey() {
  const createOptions = await fetch("/api/auth/passkeys/register/initialize", {
    method: "POST",
  }).then((res) => res.json());

  const credential = await create(createOptions);

  await fetch("/api/auth/passkeys/register/finalize", {
    method: "POST",
    body: JSON.stringify(credential),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

const PasskeysView = () => {
  const { t } = useLocale();

  const {
    data: data,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["passkeys", "list"],
    queryFn: () =>
      fetch("/api/auth/passkeys/list").then((res) => res.json()) as Promise<{ credentials: Passkey[] }>,
  });

  const register = useMutation({
    mutationFn: registerPasskey,
    onSuccess: () => {
      refetch();
    },
    onError: () => {
      showToast(t("passkey_registration_failed"), "error");
    },
  });

  const AddPasskeyButton = () => {
    return (
      <Button color="secondary" StartIcon="plus" onClick={() => register.mutate()}>
        {t("add")}
      </Button>
    );
  };

  if (isLoading || !data) {
    return (
      <SkeletonLoader
        title={t("passkeys")}
        description={t("register_first_passkey_description", { appName: APP_NAME })}
      />
    );
  }

  return (
    <>
      <Meta
        title={t("passkeys")}
        description={t("register_first_passkey_description", { appName: APP_NAME })}
        CTA={<AddPasskeyButton />}
        borderInShellHeader={true}
      />

      <div>
        {data?.credentials.length ? (
          <>
            <div className="border-subtle rounded-b-lg border border-t-0">
              {data.credentials.map((pk) => (
                <PasskeyListItem key={pk.id} {...pk} onRemoved={refetch} />
              ))}
            </div>
          </>
        ) : (
          <EmptyScreen
            customIcon={
              <div className="bg-emphasis mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full">
                <PasskeyIcon className="h-8 w-8" />
              </div>
            }
            headline={t("register_first_passkey")}
            description={t("register_first_passkey_description", { appName: APP_NAME })}
            className="rounded-b-lg rounded-t-none border-t-0"
            buttonRaw={<AddPasskeyButton />}
          />
        )}
      </div>
    </>
  );
};

PasskeysView.getLayout = getLayout;
PasskeysView.PageWrapper = PageWrapper;

export default PasskeysView;
