import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { doc, runTransaction, getFirestore } from "firebase/firestore";

import firebaseApp from "./config";
import { defaultProfile } from "./constants";

// Initialize Firebase Services
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

export const firebaseSignUp = async (email, password) => {
  let result = null,
    error = null;
  try {
    result = await createUserWithEmailAndPassword(auth, email, password);

    // create default profile data
    const defaultProfileData = { ...defaultProfile, uid: result.user.uid };

    // add default profile data to user's profile collection
    await runTransaction(db, async (transaction) => {
      const profileRef = doc(db, "profiles", result.user.uid);
      const profileSnap = await transaction.get(profileRef);
      if (!profileSnap.exists()) {
        transaction.set(profileRef, defaultProfileData);
      }
    });
  } catch (e) {
    error = e;
  }
  return { result, error };
};
