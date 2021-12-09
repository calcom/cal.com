import { StarIcon } from "@heroicons/react/solid";
import { useState } from "react";

import { useLocale } from "@lib/hooks/useLocale";

import { Dialog } from "@components/Dialog";
import Shell from "@components/Shell";
import AllApps from "@components/apps/AllApps";
import AppStoreCategories from "@components/apps/Categories";
import Slider from "@components/apps/Slider";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";

interface AppProperties {
  logo: string;
  name: string;
  category: string;
  description: string;
  rating: number;
}

export default function Apps() {
  const { t } = useLocale();
  const [showModal, setShowModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState({} as AppProperties);

  const popularCategories = [
    {
      name: "Payments",
      count: 1,
    },
    {
      name: "Video Conferencing",
      count: 3,
    },
    {
      name: "Calendar",
      count: 4,
    },
  ];

  return (
    <Shell heading={t("app_store")} subtitle={t("app_store_description")} large>
      {/* TODO: Make other views trigger the modal */}
      <AppStoreCategories categories={popularCategories} />
      <Slider showModalFunction={setShowModal} setSelectedAppFunction={setSelectedApp} />
      <AllApps showModalFunction={setShowModal} setSelectedAppFunction={setSelectedApp} />
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
