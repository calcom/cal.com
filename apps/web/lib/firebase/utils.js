import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getAuth,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  runTransaction,
  getDocs,
  collection,
  query,
  where,
  or,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import firebaseApp from "./config";
import { defaultProfile } from "./constants";

// Initialize Firebase Services
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

export const signUp = async (email, password) => {
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

export const signIn = async (email, password) => {
  let result = null,
    error = null;
  try {
    result = await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    error = e;
  }
  return { result, error };
};

export const forgotPassword = async (email) => {
  let result = null,
    error = null;
  try {
    result = await sendPasswordResetEmail(auth, email);
  } catch (e) {
    error = e;
  }
  return { result, error };
};

export const updateProfile = async ({ profileData }) => {
  try {
    const { uid } = auth.currentUser;
    console.log("Updating profile for: ", uid);
    const oldProfileData = await getProfile(uid);
    let newProfileData = { ...oldProfileData, ...profileData, uid };
    console.log({ newProfileData });
    const result = setDoc(doc(db, "profiles", uid), newProfileData);
    console.log({ result });
    return result;
  } catch (error) {
    return error;
  }
};

export const addProfile = (profileData) => {
  try {
    const user = auth.currentUser;
    const email = user.email;
    profileData = { ...profileData, email };
    const result = setDoc(doc(db, "profiles", user.uid), profileData);
    return result;
  } catch (error) {
    return error;
  }
};

export const addUserEmail = (email) => {
  try {
    const user = auth.currentUser;
    const addedToProfiles = setDoc(doc(db, "profiles", user.uid), { email }, { merge: true });
    const addedToCustomers = setDoc(doc(db, "customers", user.uid), { email }, { merge: true });
    return { addedToProfiles, addedToCustomers };
  } catch (error) {
    return error;
  }
};

export const uploadPhoto = async (file) => {
  const user = auth.currentUser;
  const avatarRef = ref(storage, `avatars/${user.uid}`);
  await uploadBytes(avatarRef, file);
  return getDownloadURL(avatarRef);
};

export const logOut = async () => {
  try {
    const result = await signOut(auth);
    return result;
  } catch (error) {
    return error;
  }
};

export const getProfile = async (userIdOrUsername) => {
  try {
    const profilesRef = collection(db, "profiles");

    const profileQuery = query(
      profilesRef,
      or(where("username", "==", userIdOrUsername), where("uid", "==", userIdOrUsername))
    );

    const profileQuerySnapshot = await getDocs(profileQuery);

    if (!profileQuerySnapshot.empty) {
      return profileQuerySnapshot.docs[0].data();
    }

    throw new Error("No such user!");
  } catch (error) {
    return error;
  }
};

export const getAllProfiles = async () => {
  try {
    const usersSnap = await getDocs(collection(db, "profiles"));
    return usersSnap.docs.map((doc) => doc.data());
  } catch (error) {
    return error;
  }
};

export const getUserBookings = async (userIdOrUsername) => {
  try {
    let bookings = [];
    const customersRef = await getDocs(collection(db, "customers", userIdOrUsername, "payments"));
    customersRef.forEach((payment) => bookings.push(payment.data()));
    return bookings;
  } catch (error) {
    return error;
  }
};
