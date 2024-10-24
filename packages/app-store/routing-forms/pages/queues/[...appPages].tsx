"use client";

import React from "react";

import Shell from "@calcom/features/shell/Shell";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import SingleForm, {
  getServerSidePropsForSingleFormView as getServerSideProps,
} from "../../components/SingleForm";
import "../../components/react-awesome-query-builder/styles.css";

export default function Queues({
  form,
  appUrl,
  enrichedWithUserProfileForm,
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  return (
    <SingleForm
      form={form}
      appUrl={appUrl}
      enrichedWithUserProfileForm={enrichedWithUserProfileForm}
      Page={function Page() {
        return (
          <div>
            Queues
            <div>
              {/* <div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    testRouting();
                  }}>
                  <div className="px-1">
                    {form && <FormInputFields form={form} response={response} setResponse={setResponse} />}
                  </div>
                  <div>{testResult}</div>
                  <DialogFooter>
                    <DialogClose
                      color="secondary"
                      onClick={() => {
                        setIsTestPreviewOpen(false);
                        setChosenRoute(null);
                        setResponse({});
                      }}>
                      {t("close")}
                    </DialogClose>
                    <Button type="submit" data-testid="test-routing">
                      {t("test_routing")}
                    </Button>
                  </DialogFooter>
                </form>
              </div> */}
            </div>
          </div>
        );
      }}
    />
  );
}

Queues.getLayout = (page: React.ReactElement) => {
  return (
    <Shell backPath="/apps/routing-forms/forms" withoutMain={true}>
      {page}
    </Shell>
  );
};

export { getServerSideProps };
