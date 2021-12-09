import { ChevronLeftIcon } from "@heroicons/react/solid";
import { StarIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";
import { useState } from "react";

import { getApps } from "@lib/getApps";
import { useLocale } from "@lib/hooks/useLocale";

import { Dialog } from "@components/Dialog";
import Shell from "@components/Shell";
import AppCard from "@components/apps/AppCard";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import Button from "@components/ui/Button";

interface AppProperties {
  logo: string;
  name: string;
  category: string;
  description: string;
  rating: number;
}

export default function Apps() {
  const { t } = useLocale();
  const router = useRouter();
  const apps = getApps();
  const [showModal, setShowModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState({} as AppProperties);

  return (
    <Shell
      heading={router.query.category + " - " + t("app_store")}
      subtitle={t("app_store_description")}
      large>
      <div className="mb-8">
        <Button color="secondary" href="/apps">
          <ChevronLeftIcon className="w-5 h-5" /> Back to app store
        </Button>
      </div>
      <div className="mb-16">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">All {router.query.category} apps</h2>
        <div className="grid grid-cols-3 gap-3">
          {apps.map((app) => {
            return (
              app.category === router.query.category && (
                <AppCard
                  key={app.name}
                  name={app.name}
                  description={app.description}
                  logo={app.logo}
                  rating={app.rating}
                  showModalFunction={setShowModal}
                  setSelectedAppFunction={setSelectedApp}
                />
              )
            );
          })}
        </div>
      </div>
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <ConfirmationDialogContent
          variety="custom"
          customIcon={selectedApp.logo}
          title={selectedApp.name}
          confirmBtnText="Add this app"
          cancelBtnText="Close"
          onConfirm={() => {
            // TODO: Actually add the integration
            console.log("The magic is supposed to happen here");
          }}>
          <div className="flex text-sm text-gray-800">
            {selectedApp.rating} stars <StarIcon className="w-4 h-4 ml-1 text-yellow-600 mt-0.5" />
          </div>
          {selectedApp.description}
        </ConfirmationDialogContent>
      </Dialog>
    </Shell>
  );
}
