// this form is to create oauth client
// update oauth client part can come later
// contains properties oauth client id (optional)
// if theres client id that means were updating the form
// if no client id were creating the form
//  one handle submit prop
// create form state using react hook form (use react hook form hooks)
// so in this component we manage the form and the values of the form
// when the user clicks on save we just call handleSubmit from the props passing the form data
import { Plus } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { Controller } from "react-hook-form";

import { Meta, Button, TextField, Avatar, Label, ImageUploader } from "@calcom/ui";

type FormValues = {
  name: string;
  logo?: string;
  redirect_uri_one: string;
  redirect_uri_two?: string;
  redirect_uri_three?: string;
  redirect_uris: string[];
  permissions: number;
  eventTypeRead: boolean;
  eventTypeWrite: boolean;
  bookingRead: boolean;
  bookingWrite: boolean;
  scheduleRead: boolean;
  scheduleWrite: boolean;
};

export const OAuthClientForm = () => {
  const { register, handleSubmit, control, setValue } = useForm<FormValues>({});

  function handleFormSubmit(e: any) {
    e.preventDefault();

    handleSubmit((data) => {
      console.log(data);
    })();
  }

  return (
    <div>
      <Meta
        title="OAuth client creation form"
        description="This is a form to create a new OAuth client"
        borderInShellHeader={true}
      />
      <form
        className="border-subtle rounded-b-lg border border-t-0 px-4 pb-8 pt-2"
        onSubmit={handleFormSubmit}>
        <div className="mt-6">
          <TextField required={true} label="Client name" {...register("name")} />
        </div>
        <div className="mt-6">
          <Controller
            control={control}
            name="logo"
            render={({ field: { value } }) => (
              <>
                <Label>Client logo</Label>
                <div className="flex items-center">
                  <Avatar
                    alt=""
                    imageSrc={value}
                    fallback={<Plus className="text-subtle h-4 w-4" />}
                    size="sm"
                  />
                  <div className="ms-4">
                    <ImageUploader
                      target="avatar"
                      id="vatar-upload"
                      buttonMsg="Upload"
                      imageSrc={value}
                      handleAvatarChange={(newAvatar: string) => {
                        setValue("logo", newAvatar);
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          />
        </div>
        <div className="mt-6">
          <TextField label="Redirect uris" required={true} {...register("redirect_uri_one")} />
        </div>
        <div className="mt-6">
          <TextField label="" {...register("redirect_uri_two")} />
        </div>
        <div className="mt-6">
          <TextField label="" {...register("redirect_uri_three")} />
        </div>

        <div className="mt-6">
          <h1 className="text-base font-semibold underline">Permissions</h1>
          <div>
            <div className="mt-3">
              <p className="text-sm">Event type</p>
              <div className="mt-1 flex gap-x-5">
                <div className="flex items-center gap-x-2">
                  <input
                    className="bg-default border-default h-4 w-4 shrink-0 rounded-[4px] border ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                    type="checkbox"
                    {...register("eventTypeRead")}
                  />
                  <label className="text-sm" htmlFor="eventTypeWrite">
                    Read
                  </label>
                </div>
                <div className="flex items-center gap-x-2">
                  <input
                    className="bg-default border-default h-4 w-4 shrink-0 rounded-[4px] border ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                    type="checkbox"
                    {...register("eventTypeWrite")}
                  />
                  <label className="text-sm" htmlFor="eventTypeWrite">
                    Write
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-sm font-semibold">Booking</p>
              <div className="mt-1 flex gap-x-5">
                <div className="flex items-center gap-x-2">
                  <input
                    {...register("bookingRead")}
                    className="bg-default border-default h-4 w-4 shrink-0 rounded-[4px] border ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                    type="checkbox"
                  />
                  <label className="text-sm">Read</label>
                </div>
                <div className="flex items-center gap-x-2">
                  <input
                    {...register("bookingWrite")}
                    className="bg-default border-default h-4 w-4 shrink-0 rounded-[4px] border ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                    type="checkbox"
                  />
                  <label className="text-sm">Write</label>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-sm font-semibold">Schedule</p>
              <div className="mt-1 flex gap-x-5">
                <div className="flex items-center gap-x-2">
                  <input
                    {...register("scheduleRead")}
                    className="bg-default border-default h-4 w-4 shrink-0 rounded-[4px] border ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                    type="checkbox"
                  />
                  <label className="text-sm">Read</label>
                </div>
                <div className="flex items-center gap-x-2">
                  <input
                    {...register("scheduleWrite")}
                    className="bg-default border-default h-4 w-4 shrink-0 rounded-[4px] border ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                    type="checkbox"
                  />
                  <label className="text-sm">Write</label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Button className="mt-6" type="submit">
          Submit
        </Button>
      </form>
    </div>
  );
};
