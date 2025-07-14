"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "@calcom/ui/components/button";
import { FileUploader, type FileData } from "@calcom/ui/components/file-uploader";
import { Label, TextArea } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@calcom/ui/popover";
import { showToast } from "@calcom/ui/toast";

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
  const [error, setError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const { data: session } = useSession();

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

      const res = await fetch(`/api/support/upload?name=${file.name}&size=${file.size}`).then((res) =>
        res.json()
      );
      console.log("res: ", res);
      return;

      const {
        attachment: { id: attachmentId },
        uploadUrl,
        uploadFormData,
      } = await fetch(`/api/support/upload?name=${file.name}&size=${file.size}`).then((res) => res.json());

      console.log("uploadUrl: ", uploadUrl);
      console.log("uploadFormData: ", uploadFormData);
      console.log("attachmentId: ", attachmentId);

      const formData = new FormData();
      uploadFormData.forEach(({ key, value }: any) => {
        formData.append(key, value);
      });

      formData.append("file", file);

      fetch(uploadUrl, {
        method: "POST",
        body: formData,
      })
        .then((response) => {
          if (!response.ok) {
            showToast("Failed to upload file", "error");
          }
        })
        .catch((error) => {
          console.log("Error uploading file: ", error?.message ? error?.message : error);
        });
      setUploads((prev) =>
        prev.map((upload) => (upload.file === file ? { ...upload, uploading: false, attachmentId } : upload))
      );
      setData((prev) => ({
        ...prev,
        attachmentIds: [...prev.attachmentIds, attachmentId],
      }));
      setIsUploadingImage(false);
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

  useEffect(() => {
    console.log("uploads", uploads);
    console.log("data: ", data);
  }, [uploads, data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/plain-contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit contact form");
      }

      setIsSubmitted(true);
      setData({
        message: "",
        attachmentIds: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setData({
      message: "",
      attachmentIds: [],
    });
  };

  return (
    <div className="absolute bottom-4 right-4 z-50">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild className="hover:bg-transparent">
          <Button
            onClick={() => setIsOpen(true)}
            className="bg-subtle text-emphasis flex h-12 w-12 items-center justify-center rounded-full border-none">
            <Icon name="message-circle" className="h-6 w-6" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          style={{ maxWidth: "450px", maxHeight: "650px" }}
          className="mb-2 mr-8 w-[450px] overflow-hidden overflow-y-scroll px-6 py-4">
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
              <div className="text-center">
                <div className="mb-4 text-green-600">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="mb-2 text-lg font-medium text-gray-900">Message Sent</h4>
                <p className="mb-4 text-sm text-gray-600">
                  Thank you for contacting us. We&apos;ll get back to you as soon as possible.
                </p>
                <Button color="minimal" onClick={resetForm} variant="button" size="sm">
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

                {error && (
                  <div className="rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="mt-4 flex w-full items-center">
                  <Button
                    color="secondary"
                    variant="button"
                    type="submit"
                    disabled={isSubmitting}
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
