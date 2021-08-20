import { useState } from "react";
import md5 from "../lib/md5";

export default function Avatar({
  user,
  className = "",
  fallback,
  imageSrc = "",
}: {
  user: any;
  className?: string;
  fallback?: JSX.Element;
  imageSrc?: string;
}) {
  const [gravatarAvailable, setGravatarAvailable] = useState(true);

  if (imageSrc) {
    return <img src={imageSrc} alt="Avatar" className={className} />;
  }

  if (user.avatar) {
    return <img src={user.avatar} alt="Avatar" className={className} />;
  }

  if (gravatarAvailable) {
    return (
      <img
        onError={() => setGravatarAvailable(false)}
        src={`https://www.gravatar.com/avatar/${md5(user.email)}?s=160&d=identicon&r=PG`}
        alt="Avatar"
        className={className}
      />
    );
  }

  return fallback || null;
}
