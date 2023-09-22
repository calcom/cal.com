import { onAuthStateChanged, getAuth } from "firebase/auth";
import { useRouter } from "next/router";
import React from "react";

// import Spinner from "ui/spinner";
import firebaseApp from "../lib/firebase/config";

const auth = getAuth(firebaseApp);

export const AuthContext = React.createContext({});

export const useAuthContext = () => React.useContext(AuthContext);

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAccountPage = router.pathname.startsWith("/account");

  return (
    <AuthContext.Provider value={{ user }}>
      {isAccountPage && loading ? (
        <div className="flex min-h-screen items-center justify-center">
          Loading...
          {/* <Spinner label="Authenticating, please wait..." /> */}
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
