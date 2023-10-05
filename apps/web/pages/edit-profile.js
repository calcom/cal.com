import { Button } from "@shadcdn/ui/button";
import Spinner from "@ui/spinner";
import clsx from "clsx";
import { useAuthContext } from "context/authContext";
import { NextSeo } from "next-seo";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Linkedin } from "react-bootstrap-icons";
import toast from "react-hot-toast";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import { defaultProfile } from "@lib/firebase/constants";
import { addProfile, uploadPhoto, logOut, getProfile } from "@lib/firebase/utils";

import PageWrapper from "@components/PageWrapper";
import AdviceSection from "@components/edit-profile/Account/AdviceSection";
import BooksSection from "@components/edit-profile/Account/BooksSection";
import CalcomSetup from "@components/edit-profile/Account/CalcomSetup";
import ExperienceSection from "@components/edit-profile/Account/Experience";
import FactsSection from "@components/edit-profile/Account/FactsSection";
import LinkedinImporter from "@components/edit-profile/Account/LinkedinImporter";
import Links from "@components/edit-profile/Account/Links";
import Navbar from "@components/edit-profile/Account/Navbar";
import PodcastAppearancesSection from "@components/edit-profile/Account/PodcastAppearancesSection";
import PodcastsSection from "@components/edit-profile/Account/PodcastsSection";
import ProfileSection from "@components/edit-profile/Account/ProfileSection";
import ProjectsSection from "@components/edit-profile/Account/ProjectsSection";
import PublicationsSection from "@components/edit-profile/Account/PublicationsSection";
import VideosSection from "@components/edit-profile/Account/VideosSection";

import { ssrInit } from "@server/lib/ssr";

import { Container } from "../ui";

const EditProfile = (props) => {
  console.log("user", JSON.parse(props.user));
  // const router = useRouter();
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [profile, setProfile] = useState(defaultProfile);

  const [activeSetting, setActiveSetting] = useState("profile");
  const [avatarFile, setAvatarFile] = useState(null);

  const addAdviceItem = () => {
    const newAdviceItem = "";
    setProfile((prevProfile) => ({
      ...prevProfile,
      advice_on: [...prevProfile.advice_on, newAdviceItem],
    }));
  };

  const removeAdviceItem = (index) => {
    setProfile((prevProfile) => ({
      ...prevProfile,
      advice_on: prevProfile.advice_on.filter((_, i) => i !== index),
    }));
  };

  const addProject = () => {
    const newProject = {
      title: "",
      url: "",
      description: "",
    };
    setProfile((prevProfile) => ({
      ...prevProfile,
      projects: [...prevProfile.projects, newProject],
    }));
  };

  const addExperience = () => {
    const newExperience = {
      company: "",
      url: "",
      roles: [
        {
          title: "",
          description: "",
          start_date: "",
          end_date: "",
        },
      ],
    };
    setProfile((prevProfile) => ({
      ...prevProfile,
      experience: [...prevProfile.experience, newExperience],
    }));
  };

  const addPodcastAppearance = () => {
    const newAppearance = {
      title: "",
      url: "",
    };
    setProfile((prevProfile) => ({
      ...prevProfile,
      appearances: [...prevProfile.appearances, newAppearance],
    }));
  };

  const addBook = () => {
    const newBook = {
      isbn: "",
    };
    setProfile((prevProfile) => ({
      ...prevProfile,
      books: prevProfile?.books?.length ? [...prevProfile.books, newBook] : [newBook],
    }));
  };

  const addVideo = () => {
    const newVideo = {
      title: "",
      url: "",
      description: "",
    };
    setProfile((prevProfile) => ({
      ...prevProfile,
      videos: prevProfile?.videos?.length ? [...prevProfile.videos, newVideo] : [newVideo],
    }));
  };

  const addFact = () => {
    const newFact = {
      title: "",
      url: "",
      description: "",
    };
    setProfile((prevProfile) => ({
      ...prevProfile,
      facts: [...prevProfile.facts, newFact],
    }));
  };

  const removeFact = (index) => {
    setProfile((prevProfile) => ({
      ...prevProfile,
      facts: prevProfile.facts.filter((_, i) => i !== index),
    }));
  };

  const addPodcast = () => {
    setProfile({
      ...profile,
      podcast: {
        title: "",
        url: "",
        cover_image: "",
        episodes: [
          {
            title: "",
            url: "",
          },
        ],
      },
    });
  };

  const deletePodcast = () => {
    setProfile({
      ...profile,
      podcast: null,
    });
  };

  const addPodcastEpisode = () => {
    setProfile({
      ...profile,
      podcast: {
        ...profile.podcast,
        episodes: [
          ...profile.podcast.episodes,
          {
            title: "",
            url: "",
          },
        ],
      },
    });
  };

  const removePodcastEpisode = (index) => {
    const newEpisodes = [...profile.podcast.episodes];
    newEpisodes.splice(index, 1);
    setProfile({
      ...profile,
      podcast: {
        ...profile.podcast,
        episodes: newEpisodes,
      },
    });
  };

  const removePublication = (index) => {
    setProfile((prevProfile) => ({
      ...prevProfile,
      publications: prevProfile.publications.filter((_, i) => i !== index),
    }));
  };

  const removeVideo = (index) => {
    setProfile((prevProfile) => ({
      ...prevProfile,
      videos: prevProfile.videos.filter((_, i) => i !== index),
    }));
  };

  const removeBook = (index) => {
    setProfile((prevProfile) => ({
      ...prevProfile,
      books: prevProfile.books.filter((_, i) => i !== index),
    }));
  };

  const removeProject = (index) => {
    setProfile((prevProfile) => ({
      ...prevProfile,
      projects: prevProfile.projects.filter((_, i) => i !== index),
    }));
  };

  const removePodcastAppearance = (index) => {
    setProfile((prevProfile) => ({
      ...prevProfile,
      appearances: prevProfile.appearances.filter((_, i) => i !== index),
    }));
  };

  const removeExperience = (index) => {
    setProfile((prevProfile) => ({
      ...prevProfile,
      experience: prevProfile.experience.filter((_, i) => i !== index),
    }));
  };

  const removeExperienceRole = (experienceIndex, roleIndex) => {
    setProfile((prevProfile) => {
      const newExperience = [...prevProfile.experience];
      newExperience[experienceIndex].roles = newExperience[experienceIndex].roles.filter(
        (_, i) => i !== roleIndex
      );
      return {
        ...prevProfile,
        experience: newExperience,
      };
    });
  };

  const addPublication = () => {
    const newPublication = {
      title: "",
      url: "",
      description: "",
    };
    setProfile((prevProfile) => ({
      ...prevProfile,
      publications: [...prevProfile.publications, newPublication],
    }));
  };

  const handleSubmit = async (event) => {
    try {
      setFormLoading(true);
      event.preventDefault();
      const docData = avatarFile ? { ...profile, avatar_url: await uploadPhoto(avatarFile) } : profile;
      await addProfile(docData);
      toast.success("Profile updated successfully 🎉");
    } catch (error) {
      toast.error("Something went wrong 😕");
    } finally {
      setFormLoading(false);
    }
  };

  // const hasBasicDetails = (profile) => {
  //   const hasName = profile.name || profile?.name?.length;
  //   const hasBio = profile?.bio?.content?.length && profile?.bio?.content[0]?.content?.length;
  //   console.info({ hasName, hasBio });
  //   return hasName && hasBio;
  // };

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.email && user?.uid) {
        const userId = user.uid;
        const fetchedProfile = await getProfile(userId);
        setProfile(fetchedProfile);
        console.info(fetchedProfile);

        // if (!hasBasicDetails(fetchedProfile)) {
        //   router.push("/onboarding/basic-details");
        //   return;
        // }

        // if (!fetchedProfile?.advice_on?.length) {
        //   router.push("/onboarding/advices");
        //   return;
        // }
      } else if (user?.uid && !user?.email) {
        setProfile(defaultProfile);
        // router.push("/onboarding/basic-details");
      } else {
        // router.push("/auth/login");
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, [user]);

  const SETTINGS = [
    {
      label: "Profile",
      value: "profile",
      content: (
        <>
          <ProfileSection profile={profile} setProfile={setProfile} setAvatarFile={setAvatarFile} />
        </>
      ),
    },
    {
      label: "Calendar",
      value: "calendar",
      content: (
        <>
          <CalcomSetup profile={profile} setProfile={setProfile} setAvatarFile={setAvatarFile} />
        </>
      ),
    },
    {
      label: "Links",
      value: "links",
      content: <Links profile={profile} setProfile={setProfile} />,
    },
    {
      label: "Facts",
      value: "facks",
      content: (
        <FactsSection profile={profile} setProfile={setProfile} addFact={addFact} removeFact={removeFact} />
      ),
    },
    {
      label: "Advice",
      value: "advices",
      content: (
        <AdviceSection
          profile={profile}
          setProfile={setProfile}
          addAdviceItem={addAdviceItem}
          removeAdviceItem={removeAdviceItem}
        />
      ),
    },
    {
      label: "Projects",
      value: "projects",
      content: (
        <ProjectsSection
          profile={profile}
          setProfile={setProfile}
          addProject={addProject}
          removeProject={removeProject}
        />
      ),
    },
    {
      label: "Experience",
      value: "experience",
      content: (
        <ExperienceSection
          profile={profile}
          setProfile={setProfile}
          addExperience={addExperience}
          removeExperience={removeExperience}
          removeExperienceRole={removeExperienceRole}
        />
      ),
    },
    {
      label: "Publications",
      value: "publications",
      content: (
        <PublicationsSection
          profile={profile}
          setProfile={setProfile}
          addPublication={addPublication}
          removePublication={removePublication}
        />
      ),
    },
    {
      label: "Podcasts",
      value: "podcasts",
      content: (
        <PodcastsSection
          profile={profile}
          setProfile={setProfile}
          addPodcast={addPodcast}
          deletePodcast={deletePodcast}
          addPodcastEpisode={addPodcastEpisode}
          removePodcastEpisode={removePodcastEpisode}
        />
      ),
    },
    {
      label: "Podcast Appearences",
      value: "podcast-appearances",
      content: (
        <PodcastAppearancesSection
          profile={profile}
          setProfile={setProfile}
          addPodcastAppearance={addPodcastAppearance}
          removePodcastAppearance={removePodcastAppearance}
        />
      ),
    },
    {
      label: "Books Published",
      value: "books-published",
      content: (
        <BooksSection profile={profile} setProfile={setProfile} addBook={addBook} removeBook={removeBook} />
      ),
    },
    {
      label: "Videos",
      value: "videos",
      content: (
        <VideosSection
          profile={profile}
          setProfile={setProfile}
          addVideo={addVideo}
          removeVideo={removeVideo}
        />
      ),
    },
    {
      label: "Linkedin Importer",
      value: "linkedin-importer",
      content: <LinkedinImporter profile={profile} setProfile={setProfile} />,
      suffix: <Linkedin className="ml-auto h-4 w-4 text-[#0077b5]" />,
    },
  ];

  return (
    <main className="min-h-screen bg-white">
      <NextSeo title="Profile Settings - Borg.id" />
      <Navbar uid={user?.uid} logOut={logOut} email={user?.email} />
      {isLoading ? (
        <div className="flex min-h-screen items-center justify-center">
          <Spinner label="Loading profile..." />
        </div>
      ) : (
        <div className="my-5 md:my-20">
          <Container width="960px" className="">
            <div className="grid items-start md:grid-cols-[200px_1fr] md:gap-12">
              <div className="flex h-[calc(100vh-200px)] max-w-full flex-row flex-nowrap gap-2 overflow-scroll whitespace-nowrap md:sticky md:top-[100px] md:flex-col md:gap-1 md:whitespace-normal">
                {SETTINGS?.map((item) => (
                  <div key={item?.value} className="pb-3 md:w-full md:pb-0">
                    <Button
                      // className="w-full bg-transparent text-black hover:text-white"
                      // variant={activeSetting === item?.value ? "link" : "ghost"}
                      className={clsx(
                        "h-auto w-full justify-start rounded-lg bg-transparent !py-[6px] text-base text-black hover:bg-gray-100 md:text-sm",
                        activeSetting === item?.value &&
                          "bg-black font-semibold text-white hover:!bg-black hover:!text-white"
                      )}
                      onClick={() => setActiveSetting(item?.value)}
                      suffix={item?.suffix}>
                      {item?.label}
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt:pt-0 border-t border-gray-200/60 pt-5 md:min-h-screen md:border-l md:border-t-0 md:pl-10 md:pt-0">
                <form onSubmit={handleSubmit}>
                  {SETTINGS?.filter((item) => item?.value === activeSetting)[0]?.content || ""}
                  <div className="sticky bottom-[20px] right-0 z-40 flex w-full justify-end">
                    <div className="rounded-xl backdrop-blur">
                      <div className="space-y-12" />
                      <div className="flex items-center justify-end gap-x-3 py-4">
                        <Button type="button" variant="outline" asChild="a">
                          <Link href={`/${profile?.username || profile?.uid}`}>View Profile</Link>
                        </Button>
                        <Button
                          className="bg-black text-white"
                          variant="primary"
                          loading={formLoading}
                          type="submit">
                          {formLoading ? "Submitting" : "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </Container>
        </div>
      )}
    </main>
  );
};

export const getServerSideProps = async (context) => {
  const { req, res } = context;

  const session = await getServerSession({ req, res });

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const ssr = await ssrInit(context);

  await ssr.viewer.me.prefetch();

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!user) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  // if (!user.completedOnboarding) {
  //   return { redirect: { permanent: false, destination: "/event-types" } };
  // }

  return {
    props: {
      user: JSON.stringify(user),
    },
  };
};

EditProfile.PageWrapper = PageWrapper;

export default EditProfile;
