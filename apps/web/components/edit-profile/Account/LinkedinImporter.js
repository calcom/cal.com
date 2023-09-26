import {
  isValidLinkedInUrl,
  extractUserNameFromLinkedinUrl,
  linkedinExperienceTransformer,
  linkedinProjectsTransformer,
  linkedinPublicationsTransformer,
} from "@ui/utilities/utils";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Input } from "@calcom/ui";

import FormBlock from "./FormBlock";

const handleSubmit = async (url, setLoading, setLinkedinData) => {
  try {
    setLoading(true);
    if (!isValidLinkedInUrl(url)) return;
    const username = extractUserNameFromLinkedinUrl(url);
    if (!username) return;
    const response = await fetch(`/api/linkedin?user=${username}`);
    const data = await response.json();
    setLinkedinData(data);
    setLoading(false);
  } catch (error) {
    console.log(error);
    toast.error("Something went wrong 😕");
  }
};

const LinkedinImporter = ({ profile, setProfile }) => {
  const [loading, setLoading] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [linkedinData, setLinkedinData] = useState(null);

  async function startAutoFill() {
    const newProfile = {
      name: linkedinData.name,
      bio: linkedinData.description,
      experience: linkedinData.roles ? linkedinExperienceTransformer(linkedinData.roles) : [],
      projects: linkedinData.projects ? linkedinProjectsTransformer(linkedinData.projects) : [],
      publications: linkedinData.publications
        ? linkedinPublicationsTransformer(linkedinData.publications)
        : [],
    };
    console.log(newProfile);
    setProfile({ ...profile, ...newProfile });
    toast.success("Profile filled successfully, dont forget to save it");
  }

  return (
    <FormBlock
      title="Linkedin Importer"
      description="Have our robots fill your profile in seconds will the relevant information.">
      <div>
        <Input label="Linkedin URL" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
        <div className="mt-4">
          <Button
            type="button"
            label="Start Importing"
            disabled={!isValidLinkedInUrl(linkedinUrl)}
            className={!isValidLinkedInUrl(linkedinUrl) && "cursor-not-allowed opacity-50"}
            loading={loading}
            onClick={() => handleSubmit(linkedinUrl, setLoading, setLinkedinData)}
          />
        </div>
        <br />
        <hr />
        {linkedinData && linkedinData?.name && (
          <div className="mt-4">
            <p className="mb-4 font-mono text-sm">
              ✅ Linkeding profile data available, click the button below to prefill the form.
            </p>
            <Button type="button" onClick={startAutoFill} label="Confirm and Save" />
          </div>
        )}

        {linkedinData && !linkedinData?.name && (
          <div className="mt-4">
            <p className="mb-4 font-mono text-sm">
              😕 Looks like we have no data for this profile, please fill the form manually. We&apos;ve raised
              a request to our robots to start fetching the data, please check back in a few minutes
            </p>
          </div>
        )}
      </div>
    </FormBlock>
  );
};

export default LinkedinImporter;
