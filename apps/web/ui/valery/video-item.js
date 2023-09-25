import { cx } from "class-variance-authority";
import clsx from "clsx";
import Link from "next/link";
import PropTypes from "prop-types";
import React from "react";

function VideoItem({ video, className }) {
  const getYtCoverImage = (url) => {
    let videoId = "";

    const queryParamsMatch = url.match(/[?&]v=([^&]+)/);
    if (queryParamsMatch && queryParamsMatch[1]) {
      videoId = queryParamsMatch[1];
    }

    if (!videoId) {
      const shortUrlMatch = url.match(/youtu\.be\/([^?]+)/);
      if (shortUrlMatch && shortUrlMatch[1]) {
        videoId = shortUrlMatch[1];
      }
    }

    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    } else {
      return null;
    }
    // return null
  };

  return (
    <div className={cx("flex h-min w-full flex-col", className)}>
      <Link href={video?.url || "#"} className={clsx("self-start font-semibold")}>
        <div className="relative aspect-video after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:right-0 after:top-0 after:z-10 after:z-10 after:rounded-lg after:shadow-[inset_0_0_0_1px_rgba(0,_0,_0,_0.05)]">
          <img
            src={
              getYtCoverImage(video?.url) ||
              `https://i.vimeocdn.com/video/499134794-0e30b7b4f310669590490d68c546fe9a4c00f2a16a66579bfb7cff3451fd3ea3-d`
            }
            alt="Book Cover"
            className="relative h-full w-full rounded-lg object-cover md:max-w-full"
          />
          {/* TODO: when we have view count - change view count to the appropriate variable */}
          {video.viewsCount && (
            <div className="absolute bottom-2 right-2 rounded-lg bg-gray-800 bg-opacity-80 px-2 text-[13px] font-medium text-white backdrop-blur-sm">
              {video.viewsCount} {video.viewsCount === 1 ? "view" : "views"}
            </div>
          )}
        </div>
        <h3 className="mt-1">{video.title}</h3>
      </Link>
    </div>
  );
}

VideoItem.propTypes = {
  className: PropTypes.string,
};

VideoItem.defaultProps = {
  className: "",
};

export default VideoItem;
