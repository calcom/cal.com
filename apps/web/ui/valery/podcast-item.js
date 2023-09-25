import { Microphone } from "@phosphor-icons/react";

const PodcastItem = ({ podcast }) => {
  return (
    <div>
      <p className="font-semibold">HOST</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {podcast?.cover_image && (
          <img
            src={podcast?.cover_image}
            alt={podcast?.title}
            className="aspect-square flex-shrink-0 rounded-lg object-cover"
          />
        )}
        {!podcast?.cover_image && (
          <div className="aspect-square flex-shrink-0 rounded-lg bg-gray-200 object-cover">
            <Microphone className="h-8 w-8 text-gray-500" />
          </div>
        )}
        <div className="col-span-1 block flex-col justify-between space-y-3 sm:col-span-2 sm:flex sm:space-y-0">
          <p className="font-semibold">{podcast?.title}</p>
          <p className="text-gray-500">Recent episodes:</p>
          {podcast?.episodes?.length > 0 &&
            podcast?.episodes.map((episode, i) => (
              <a href={episode.url} target="_blank" key={i} className="block truncate">
                {episode.title}
              </a>
            ))}
        </div>
      </div>
    </div>
  );
};

export default PodcastItem;
