import { Image } from "@phosphor-icons/react";
import { Input, Button, Label } from "@shadcdn/ui";
import Dialog from "@ui/dialog";
import RemoveButton from "@ui/fayaz/RemoveButton";
import { isValidUrl } from "@ui/utilities/utils";
import { useState } from "react";
import { toast } from "react-hot-toast";

import EmptyState from "./EmptyState";
import FormBlock from "./FormBlock";

async function getEpisodes(url, setProfile) {
  try {
    const feed = await fetch(`/api/rss-feed?feed=${url}`).then((res) => res.json());
    if (feed.episodes && feed.title && feed.url) {
      const { episodes, title, cover_image, url } = feed;
      const newPodcast = {
        title,
        url,
        cover_image,
        episodes,
      };
      setProfile((prevProfile) => ({
        ...prevProfile,
        podcast: newPodcast,
      }));
      return true; // Failed to get episodes
    } else {
      toast.error("Something went wrong. Are you sure this is a valid RSS feed?");
      return false; // Failed to get episodes
    }
  } catch (error) {
    console.error("Error fetching RSS feed:", error);
    toast.error("An error occurred while fetching the RSS feed.");
    return false; // Failed to get episodes
  }
}

const RssFeedModal = ({ profile, setProfile }) => {
  const [url, setUrl] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleExtract = async () => {
    if (isValidUrl(url)) {
      setLoading(true);
      const episodesFetched = await getEpisodes(url, setProfile);
      setLoading(false);
      if (episodesFetched) {
        setIsDialogOpen(false);
        setUrl("");
      }
    }
  };
  return (
    <Dialog
      title="Rss Feed Extractor"
      description="Get latest podcasts episodes from your RSS feed."
      trigger={
        <Button variant="outline" size="sm">
          Extract data from RSS feed
        </Button>
      }
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      content={
        <>
          <Label>URL</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} />
          <div className="mt-[25px] flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className={!isValidUrl(url) ? "cursor-not-allowed opacity-50" : ""}
              loading={loading}
              disabled={!isValidUrl(url)}
              onClick={handleExtract}>
              Extract
            </Button>
          </div>
        </>
      }
    />
  );
};

const PodcastsSection = ({
  profile,
  setProfile,
  addPodcast,
  deletePodcast,
  addPodcastEpisode,
  removePodcastEpisode,
}) => {
  const hasPodcast = profile?.podcast?.episodes;
  return (
    <FormBlock title="Podcasts" description="Showcase your star podcasts.">
      {!hasPodcast ? (
        <EmptyState label="Add your podcast and episodes" />
      ) : (
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              required
              value={profile.podcast.title}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  podcast: { ...profile.podcast, title: e.target.value },
                })
              }
            />
          </div>

          <div>
            <Label>URL</Label>
            <Input
              required
              value={profile.podcast.url}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  podcast: { ...profile.podcast, url: e.target.value },
                })
              }
            />
          </div>
          <div>
            <Label>Cover Image URL</Label>
            <Input
              label="Cover image URL"
              value={profile.podcast.cover_image}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  podcast: { ...profile.podcast, cover_image: e.target.value },
                })
              }
            />
          </div>
          {profile.podcast?.cover_image ? (
            <img
              src={profile.podcast?.cover_image}
              alt={profile.podcast?.title}
              className="h-16 w-16 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-200 object-cover">
              <Image className="h-8 w-8 text-gray-500" />
            </div>
          )}
          {profile?.podcast.episodes?.length > 0 &&
            profile?.podcast.episodes.map((podcast, i) => (
              <div key={i} className="space-y-4 pt-2">
                <div className="sm:col-span-3">
                  <Label>Episode title</Label>
                  <Input
                    required
                    value={podcast.title}
                    onChange={(e) => {
                      const newEpisode = [...profile.podcast.episodes];
                      newEpisode[i].title = e.target.value;
                      setProfile({
                        ...profile,
                        podcast: { ...profile.podcast, episodes: newEpisode },
                      });
                    }}
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label>Episode URL</Label>
                  <Input
                    required
                    label="Episode URL"
                    type="url"
                    value={podcast.url}
                    onChange={(e) => {
                      const newEpisode = [...profile.podcast.episodes];
                      newEpisode[i].url = e.target.value;
                      setProfile({
                        ...profile,
                        podcast: { ...profile.podcast, episodes: newEpisode },
                      });
                    }}
                  />
                </div>
                {profile?.podcast?.episodes?.length > 1 && (
                  <div className="col-span-full flex items-center justify-end">
                    <RemoveButton label="Remove episode" onClick={() => removePodcastEpisode(i)} />
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
      <div className="col-span-full mt-6 flex items-center gap-x-3">
        {profile?.podcast?.episodes?.length > 0 && (
          <Button onClick={addPodcastEpisode} variant="outline" size="sm">
            Add episode
          </Button>
        )}
        <Button onClick={hasPodcast ? deletePodcast : addPodcast} variant="outline" size="sm">
          {hasPodcast ? "Remove podcast" : "Add podcast"}
        </Button>
        <span>or</span>
        <RssFeedModal setProfile={setProfile} profile={profile} />
      </div>
    </FormBlock>
  );
};

export default PodcastsSection;
