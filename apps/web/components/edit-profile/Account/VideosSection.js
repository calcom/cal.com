import { Textarea, Input, Button, Label } from "@shadcdn/ui";
import RemoveButton from "@ui/fayaz/RemoveButton";
import React from "react";

import EmptyState from "./EmptyState";
import FormBlock from "./FormBlock";

const VideosSection = ({ profile, setProfile, addVideo, removeVideo }) => {
  return (
    <FormBlock title="Videos" description="Add your most popular and interesting videos">
      {!profile?.videos?.length > 0 && <EmptyState label="Add your most popular and interesting videos" />}
      <div className="space-y-4 divide-y">
        {profile?.videos?.length > 0 &&
          profile?.videos?.map((video, i) => (
            <div key={i} className="relative space-y-4 pt-4">
              <div className="col-span-full">
                <Label>Title</Label>
                <Input
                  value={video.title}
                  onChange={(e) => {
                    const newVideo = profile?.videos?.length ? [...profile.videos] : [];
                    newVideo[i].title = e.target.value;
                    setProfile({
                      ...profile,
                      videos: newVideo,
                    });
                  }}
                />
              </div>
              <div className="col-span-2">
                <Label>URL</Label>
                <Input
                  value={video.url}
                  onChange={(e) => {
                    const newVideo = profile?.videos?.length ? [...profile.videos] : [];
                    newVideo[i].url = e.target.value;
                    setProfile({
                      ...profile,
                      videos: newVideo,
                    });
                  }}
                />
              </div>
              <div className="sm:col-span-3">
                <Label>Description</Label>
                <Textarea
                  value={video.description}
                  onChange={(e) => {
                    const newVideo = profile?.videos?.length ? [...profile.videos] : [];
                    newVideo[i].description = e.target.value;
                    setProfile({
                      ...profile,
                      videos: newVideo,
                    });
                  }}
                />
              </div>
              <div className="col-span-full flex items-center justify-end">
                <RemoveButton label="Remove" onClick={() => removeVideo(i)} />
              </div>
            </div>
          ))}
      </div>
      <div className="col-span-full mt-6">
        <Button onClick={() => addVideo("videos")} variant="outline" size="sm">
          Add section
        </Button>
      </div>
    </FormBlock>
  );
};

export default VideosSection;
