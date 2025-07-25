"use client";

import { useState } from "react";

import { Button } from "@calcom/ui/components/button";
import { FileUploader, type FileData } from "@calcom/ui/components/file-uploader";
import { Label, TextArea } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@calcom/ui/components/popover";
import { showToast } from "@calcom/ui/components/toast";

interface ContactFormData {
  name: string;
  email: string;
  message: string;
  attachments?: FileData[];
}

const PlainContactForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [data, setData] = useState<{
    message: string;
    attachmentIds: string[];
  }>({
    message: "",
    attachmentIds: [],
  });

  const [uploads, setUploads] = useState<
    {
      attachmentId?: string;
      uploading: boolean;
      file: File;
      id: string;
    }[]
  >([]);

  const handleUpload = async (allFiles: FileData[], newFiles: FileData[], removedFiles: FileData[]) => {
    if (newFiles.length > 0) {
      const newFile = newFiles[0];
      setUploads((prev) => [...prev, { file: newFile.file, uploading: true, id: newFile.id }]);
      setIsUploadingImage(true);

      const { file } = newFile;

      const res = await fetch(`/api/support/upload?name=${file.name}&size=${file.size}`);
      if (!res.ok) {
        showToast("Error uploading attachment", "error");
        setIsUploadingImage(false);
        return;
      }

      const {
        uploadFormUrl,
        uploadFormData,
        attachment: { id: attachmentId },
      } = await res.json();
      setIsUploadingImage(false);

      const formData = new FormData();
      uploadFormData.forEach(({ key, value }: any) => {
        formData.append(key, value);
      });

      formData.append("file", file);

      const uploadRes = await fetch(uploadFormUrl, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        showToast(`Failed while uploading file: ${uploadRes.text}`, "error");
        setIsUploadingImage(false);
        return;
      }

      setUploads((prev) =>
        prev.map((upload) => (upload.file === file ? { ...upload, uploading: false, attachmentId } : upload))
      );
      setData((prev) => ({
        ...prev,
        attachmentIds: [...prev.attachmentIds, attachmentId],
      }));
      setIsUploadingImage(false);
      showToast("File uploaded successfully", "success");
    } else if (removedFiles.length > 0) {
      const removedFile = removedFiles[0];
      const file = uploads.find((upload) => upload.id === removedFile.id);
      if (!file) {
        console.warn("File not found in uploads: ", removedFile.id);
        return;
      }
      setData((prev) => ({
        ...prev,
        attachmentIds: prev.attachmentIds.filter((id) => id !== file.attachmentId),
      }));
      setUploads((prev) => prev.filter((upload) => upload.id !== removedFile.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        showToast(errorData.message ?? "Failed to submit contact form", "error");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitted(true);
      setIsSubmitting(false);
      setData({
        message: "",
        attachmentIds: [],
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "An error occurred", "error");
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setData({
      message: "",
      attachmentIds: [],
    });
    setUploads([]);
  };

  return (
    <div className="absolute bottom-4 right-4 z-50">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild className="enabled:hover:bg-subtle bg-subtle shadow-none">
          <Button
            onClick={() => setIsOpen(true)}
            className="bg-subtle text-emphasis flex h-12 w-12 items-center justify-center rounded-full border-none">
            <Icon name="message-circle" className="h-6 w-6" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          style={{ maxWidth: "450px", maxHeight: "650px" }}
          className="!bg-muted no-scrollbar mr-8 mb-2 w-[450px] overflow-hidden overflow-y-scroll px-6 py-4">
          <div className="flex w-full justify-between">
            <p className="mb-5 text-lg font-semibold">Contact support</p>
            <Button
              color="minimal"
              variant="button"
              StartIcon="x"
              size="sm"
              onClick={() => setIsOpen(false)}
            />
          </div>

          <div>
            {isSubmitted ? (
              <div className="py-4 text-center">
                <h4 className="mb-2 text-lg font-medium ">Message Sent</h4>
                <p className="text-subtle mb-4 text-sm">
                  Thank you for contacting us. We&apos;ll get back to you as soon as possible.
                </p>
                <Button color="primary" className="my-2" onClick={resetForm} variant="button" size="base">
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="message">Describe the issue</Label>
                  <TextArea
                    id="message"
                    name="message"
                    value={data.message}
                    onChange={(e) => setData((prev) => ({ ...prev, message: e.target.value }))}
                    placeholder="Please describe the issue you're facing, e.g. 'Busy slots are marked available', ..., etc."
                    required
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Attachments (optional)</Label>
                  <FileUploader
                    id="contact-attachments"
                    buttonMsg="Add Files"
                    onFilesChange={handleUpload}
                    acceptedFileTypes={["images", "videos"]}
                    multiple={false}
                    showFilesList
                    maxFiles={5}
                    maxFileSize={10 * 1024 * 1024}
                    disabled={isSubmitting || isUploadingImage}
                    testId="contact-form-file-upload"
                  />
                </div>

                <div className="mt-4 flex w-full items-center">
                  <Button
                    color="secondary"
                    variant="button"
                    type="submit"
                    disabled={isSubmitting || isUploadingImage}
                    className="w-full">
                    <div className="flex w-full justify-center">
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <Icon name="loader" className="mr-2 h-4 w-4 animate-spin rounded-full" />
                          Sending
                        </div>
                      ) : (
                        <>
                          <Icon name="send" className="mr-2 h-4 w-4" />
                          Send Message
                        </>
                      )}
                    </div>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default PlainContactForm;
