import { cx } from "class-variance-authority";
import clsx from "clsx";
import Link from "next/link";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";

function BookItem({ book, className }) {
  const [details, setDetails] = useState({ title: "", coverImage: "" });

  useEffect(() => {
    if (book?.isbn) {
      getBookDetails(book?.isbn);
    }
  }, [book]);

  if (!book?.isbn) {
    return ``;
  }

  const getBookDetails = async (isbn) => {
    isbn = isbn || "9781451648546";
    const url = "https://www.googleapis.com/books/v1/volumes?q=isbn:" + isbn;
    const response = await fetch(url).then((response) => response.json());
    if (response?.items?.length) {
      setDetails(response?.items[0]);
    }
  };

  return (
    <div className={cx("flex w-full flex-col justify-end sm:w-40", className)}>
      <Link
        href={book?.url || details?.volumeInfo?.infoLink || "#"}
        className={clsx("flex flex-col gap-2.5 font-semibold")}>
        <div className="relative flex">
          {/* Black shadow div masked by image */}
          <div
            className="absolute bottom-[-22%] left-[-22%] h-[144%] w-[144%] bg-black"
            style={{
              maskImage: "url(/images/book-shadow-mask.png)",
              maskRepeat: "no-repeat",
              maskSize: "100% 100%",
              WebkitMaskImage: "url(/images/book-shadow-mask.png)",
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskSize: "100% 100%",
            }}
          />
          {/* Cover image */}
          {details?.volumeInfo?.imageLinks?.thumbnail ? (
            <img
              src={details?.volumeInfo?.imageLinks?.thumbnail}
              alt="Book Cover"
              className="relative w-full rounded-sm"
            />
          ) : (
            // Placeholder
            <div className="relative flex h-60 w-40 justify-center bg-gray-100 pl-3 pr-2 pt-[33.3333%] text-center">
              <div className="line-clamp-5 h-[120px] font-light text-gray-400">
                {details?.volumeInfo?.title}
              </div>
            </div>
          )}
          {/* Cover shading */}
          <div
            className="absolute h-full w-full rounded-sm"
            style={{
              boxShadow:
                "0px 1px 1px 0px rgba(255, 255, 255, 0.55) inset, 0px -1px 1px 0px rgba(0, 0, 0, 0.15) inset",
            }}>
            <div
              className="h-full w-1.5"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255, 255, 255, 0.00) 0%, rgba(255, 255, 255, 0.31) 12.97%, rgba(255, 255, 255, 0.20) 27.12%, rgba(255, 255, 255, 0.00) 44.81%, rgba(0, 0, 0, 0.07) 53.52%, rgba(0, 0, 0, 0.13) 63.04%, rgba(0, 0, 0, 0.06) 74.48%, rgba(255, 255, 255, 0.00) 81.00%, rgba(255, 255, 255, 0.18) 86.72%, rgba(255, 255, 255, 0.18) 92.97%, rgba(255, 255, 255, 0.00) 100%)",
              }}
            />
          </div>
        </div>
        <h3 className="line-clamp-4 h-24" title={details?.volumeInfo?.title}>
          {details?.volumeInfo?.title}
        </h3>
      </Link>
    </div>
  );
}

BookItem.propTypes = {
  className: PropTypes.string,
};

BookItem.defaultProps = {
  className: "",
};

export default BookItem;
