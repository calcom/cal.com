"use client";

import { useRouter } from "next/navigation";
import React, { useRef, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";
import { Icon } from "@calcom/ui/components/icon";
import { Logo } from "@calcom/ui/components/logo";
import { showToast } from "@calcom/ui/components/toast";

import { useOnboardingStore, type Invite } from "../../store/onboarding-store";

type CSVUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const CSVUploadModal = ({ isOpen, onClose }: CSVUploadModalProps) => {
  const { t } = useLocale();
  const router = useRouter();
  const store = useOnboardingStore();
  const { setTeamInvites, teamDetails } = store;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith(".csv")) {
        showToast(t("please_upload_csv_file"), "error");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDownloadTemplate = () => {
    // Create a CSV template with headers
    const headers = ["email", "role"];
    const exampleRow = ["example@email.com", "MEMBER"];
    const csvContent = [headers.join(","), exampleRow.join(",")].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "team_invite_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    showToast(t("template_downloaded"), "success");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showToast(t("please_select_file"), "error");
      return;
    }

    setIsUploading(true);

    try {
      // Read and parse the CSV file
      const text = await selectedFile.text();
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        showToast(t("csv_file_empty"), "error");
        setIsUploading(false);
        return;
      }

      // Parse CSV (simple implementation - may need enhancement for complex CSVs)
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const emailIndex = headers.indexOf("email");
      const roleIndex = headers.indexOf("role");

      if (emailIndex === -1) {
        showToast(t("csv_missing_email_column"), "error");
        setIsUploading(false);
        return;
      }

      // Filter out empty emails and validate
      const parsedInvites = lines
        .slice(1)
        .map((line) => {
          const values = line.split(",").map((v) => v.trim());
          return {
            email: values[emailIndex]?.trim(),
            role: (roleIndex !== -1 ? values[roleIndex]?.trim().toUpperCase() : "MEMBER") as
              | "MEMBER"
              | "ADMIN",
          };
        })
        .filter((invite) => invite.email && invite.email.length > 0);

      if (parsedInvites.length === 0) {
        showToast(t("csv_file_empty"), "error");
        setIsUploading(false);
        return;
      }

      // Convert to Invite format with team name
      const invites: Invite[] = parsedInvites.map((invite) => ({
        email: invite.email,
        team: teamDetails.name,
        role: invite.role === "ADMIN" ? "ADMIN" : "MEMBER",
      }));

      // Save invites to store
      setTeamInvites(invites);

      showToast(t("csv_uploaded_successfully", { count: invites.length }), "success");
      onClose();

      // Navigate to email page to display the invites
      router.push("/onboarding/teams/invite/email");
    } catch (error) {
      console.error("Error uploading CSV:", error);
      showToast(t("error_uploading_csv"), "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent size="default" className="!p-0">
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col items-center gap-1">
            <Logo className="h-10 w-auto" />
          </div>

          {/* File upload illustration */}
          <div
            className="relative mx-auto flex items-center justify-center"
            style={{ width: 320, height: 180 }}>
            <div
              className="from-default to-muted border-subtle flex items-center justify-center rounded-2xl border bg-gradient-to-br p-8 shadow-sm"
              style={{ width: 200, height: 150 }}>
              {selectedFile ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="from-default to-muted border-subtle flex items-center justify-center rounded-full border bg-gradient-to-b p-4 shadow-sm">
                    <Icon name="file-text" className="text-emphasis" style={{ width: 32, height: 32 }} />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-emphasis text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-subtle text-xs">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="from-default to-muted border-subtle flex items-center justify-center rounded-full border bg-gradient-to-b p-4 shadow-sm">
                    <Icon
                      name="upload"
                      className="text-emphasis opacity-70"
                      style={{ width: 32, height: 32 }}
                    />
                  </div>
                  <p className="text-subtle text-center text-sm">{t("upload_csv_subtitle")}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mb-2 flex flex-col gap-2 text-center">
            <h2 className="font-cal text-emphasis text-2xl leading-none">{t("upload_csv_file")}</h2>
            <p className="text-default text-sm leading-normal">{t("upload_csv_description")}</p>
          </div>

          <div className="mb-2 flex flex-col gap-3">
            {/* Download template */}
            <div className="bg-cal-muted border-subtle flex items-center gap-3 rounded-lg border p-4">
              <div className="from-default to-muted border-subtle flex items-center justify-center rounded-full border bg-gradient-to-b p-2 shadow-sm">
                <Icon name="download" className="text-emphasis" style={{ width: 16, height: 16 }} />
              </div>
              <div className="flex-1">
                <p className="text-emphasis text-sm font-medium">{t("need_template")}</p>
                <p className="text-subtle text-xs">{t("download_csv_template_description")}</p>
              </div>
              <Button color="secondary" StartIcon="download" size="sm" onClick={handleDownloadTemplate}>
                {t("download_template")}
              </Button>
            </div>

            {/* File upload */}
            <div className="bg-cal-muted border-subtle flex items-center gap-3 rounded-lg border p-4">
              <div className="from-default to-muted border-subtle flex items-center justify-center rounded-full border bg-gradient-to-b p-2 shadow-sm">
                <Icon name="upload" className="text-emphasis" style={{ width: 16, height: 16 }} />
              </div>
              <div className="flex-1">
                <p className="text-emphasis text-sm font-medium">{t("upload_your_file")}</p>
                <p className="text-subtle text-xs">
                  {selectedFile ? selectedFile.name : t("upload_csv_description")}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                color="secondary"
                StartIcon={selectedFile ? "file-text" : "upload"}
                size="sm"
                onClick={() => fileInputRef.current?.click()}>
                {t("choose_file")}
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-cal-muted border-subtle mt-6 flex items-center justify-between rounded-b-2xl border-t px-8 py-6">
          <Button color="minimal" onClick={handleClose} disabled={isUploading}>
            {t("cancel")}
          </Button>
          <Button
            color="primary"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            loading={isUploading}>
            {t("upload")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
