import { useState } from "react";
import md5 from '../lib/md5';

export default function Avatar({ user, className = '', fallback }: {
    user: any;
    className?: string;
    fallback?: JSX.Element;
}) {
    const [gravatarAvailable, setGravatarAvailable] = useState(true);

    if (user.avatar) {
    return <img src={user.avatar} alt="Avatar" className={className} />;
    }

    if (gravatarAvailable) {
        return (
            <img
            onError={() => setGravatarAvailable(false)}
            src={`https://www.gravatar.com/avatar/${md5(user.email)}?d=404&s=160`}
            alt="Avatar"
            className={className}
            />
        );
    }

    return fallback || null;
}
