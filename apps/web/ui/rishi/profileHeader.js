const ProfileHeader = ({ name, photo, introText }) => {
  return (
    <div>
      {photo ? (
        <div className="mb-5 h-20 w-20">
          <img
            src={photo}
            className="aspect-square rounded-full bg-white object-cover object-top"
            alt={name}
          />
        </div>
      ) : (
        <div className="mb-3 flex aspect-square h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-white">
          {name?.slice(0, 1)}
        </div>
      )}
      {name ? <h3 className="mb-1 text-sm font-medium opacity-50">{name}</h3> : ""}
      {introText ? <p className="text-lg">{introText}</p> : ""}
    </div>
  );
};

export default ProfileHeader;
