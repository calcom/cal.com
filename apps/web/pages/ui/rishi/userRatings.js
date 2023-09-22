import { Star } from "@phosphor-icons/react";

const UserRatings = ({ rating }) => {
  return (
    <div className="">
      <div className="mb-1 text-sm font-medium opacity-50">Reviews based on past bookings</div>
      <div className="flex items-center gap-1 text-[#f9d071]">
        <Star size={24} weight="fill" />
        <Star size={24} weight="fill" />
        <Star size={24} weight="fill" />
        <Star size={24} weight="fill" />
        <Star size={24} />
        <div className="ml-2 text-sm text-gray-500">{rating || "4"} stars</div>
      </div>
    </div>
  );
};

export default UserRatings;
