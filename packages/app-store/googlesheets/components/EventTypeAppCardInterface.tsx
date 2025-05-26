"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { EventTypeAppCardComponentProps } from "@calcom/app-store/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";
import { SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";

import { useAppCredentials } from "../lib/useAppCredentials";
import { useSheetsService } from "../lib/useSheetsService";

// Define a simple interface for spreadsheets to avoid Google API type references
interface SimpleSpreadsheet {
  id: string;
  name: string;
}

export const EventTypeAppCard = ({ eventType, app }: EventTypeAppCardComponentProps): JSX.Element => {
  const { t } = useLocale();
  const router = useRouter();
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);

  const googleSheetsMetadata = ((eventType as any).metadata || {}) as {
    googleSheets?: {
      spreadsheetId?: string;
      enabled?: boolean;
    };
  };

  const formMethods = useForm({
    defaultValues: {
      spreadsheetId: googleSheetsMetadata?.googleSheets?.spreadsheetId || "",
      enabled: googleSheetsMetadata?.googleSheets?.enabled || false,
    },
  });

  const credentials = useAppCredentials(app.slug);
  const { isLoading, spreadsheets, createSpreadsheet, setupBookingSheet, refreshSpreadsheets } =
    useSheetsService(credentials);

  const updateEventTypeMutation = trpc.viewer.eventTypes.update.useMutation({
    onSuccess: async () => {
      showToast(t("event_type_updated_successfully"), "success");
    },
    onError: (error) => {
      showToast(error.message || t("error_updating_event_type"), "error");
    },
  });

  const createNewSpreadsheet = async () => {
    if (!credentials?.length) return;

    try {
      setIsCreatingSheet(true);
      const title = `Cal.com Bookings - ${eventType.title}`;
      const newSheet = await createSpreadsheet(title);

      if (!newSheet) {
        throw new Error("Failed to create spreadsheet");
      }

      const spreadsheetId = newSheet.spreadsheetId || newSheet.id || "";
      if (!spreadsheetId) {
        throw new Error("Failed to get spreadsheet ID from created spreadsheet");
      }

      await setupBookingSheet(spreadsheetId);
      formMethods.setValue("spreadsheetId", spreadsheetId);

      showToast(t("spreadsheet_created_successfully"), "success");
    } catch (error) {
      console.error("Error creating spreadsheet:", error);
      showToast(t("error_creating_spreadsheet"), "error");
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const onSubmit = async (values: { spreadsheetId: string; enabled: boolean }) => {
    if (!values.spreadsheetId && values.enabled) {
      showToast(t("please_select_spreadsheet"), "error");
      return;
    }

    updateEventTypeMutation.mutate({
      id: eventType.id,
      metadata: {
        ...((eventType as any).metadata || {}),
        googleSheets: {
          spreadsheetId: values.spreadsheetId,
          enabled: values.enabled,
        },
      },
    });
  };

  if (!credentials?.length) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-lg font-semibold">{t("connect_google_sheets")}</h1>
        <p className="mt-2 text-sm text-gray-500">{t("connect_google_sheets_description")}</p>
        <Button
          color="secondary"
          className="mt-4"
          onClick={() => router.push(`/apps/${app.slug}`)}
          data-testid="connect-google-sheets-button">
          {t("connect")}
        </Button>
      </div>
    );
  }

  if (isLoading && !spreadsheets.length) {
    return (
      <SkeletonContainer>
        <SkeletonText className="h-4 w-full" />
        <SkeletonText className="mt-2 h-4 w-3/4" />
        <SkeletonButton className="mt-4 h-8 w-full" />
      </SkeletonContainer>
    );
  }

  return (
    <div className="p-4">
      <Form form={formMethods} handleSubmit={onSubmit}>
        <div>
          <h3 className="text-emphasis font-medium">{t("google_sheets_settings")}</h3>
          <p className="text-default text-sm">{t("google_sheets_event_settings_description")}</p>
        </div>

        <div className="mt-4">
          <div className="mb-5">
            <label htmlFor="spreadsheetId" className="block text-sm font-medium text-gray-700">
              {t("select_spreadsheet")}
            </label>
            <select
              id="spreadsheetId"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm"
              {...formMethods.register("spreadsheetId")}>
              <option value="">{t("select_option")}</option>
              {spreadsheets.map((sheet) => (
                <option key={sheet.id} value={sheet.id}>
                  {sheet.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            color="secondary"
            className="mt-2"
            onClick={createNewSpreadsheet}
            loading={isCreatingSheet}
            data-testid="create-spreadsheet-button">
            {t("create_new_spreadsheet")}
          </Button>
        </div>

        <div className="mt-4 flex items-center">
          <input
            type="checkbox"
            id="enabled"
            {...formMethods.register("enabled")}
            className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
          />
          <label htmlFor="enabled" className="ml-2 text-sm font-medium text-gray-700">
            {t("enable_google_sheets_integration")}
          </label>
        </div>

        <Button
          color="primary"
          className="mt-4"
          type="submit"
          loading={updateEventTypeMutation.isPending}
          data-testid="update-google-sheets-button">
          {t("save")}
        </Button>
      </Form>
    </div>
  );
};

export default EventTypeAppCard;
