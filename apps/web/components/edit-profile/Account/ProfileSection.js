import { Input } from "@shadcdn/ui/input";
import { Label } from "@shadcdn/ui/label";
import PhotoUpload from "@ui/fayaz/PhotoUpload";
import Tiptap from "@ui/tiptap";

import FormBlock from "./FormBlock";

const ProfileSection = ({ profile, setProfile, setAvatarFile }) => {
  return (
    <FormBlock title="Profile" description="This information will be linked to your account.">
      <div className="space-y-5">
        <div className="col-span-full">
          <Label>Full name</Label>
          <Input
            className="mt-2"
            name="name"
            autoFocus
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            required
          />
        </div>
        <div className="col-span-full">
          <Label>Write a bio about yourself</Label>
          <div className="focus-within:ring-ring mt-2 rounded-lg border p-2 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            <Tiptap
              hideInfo
              value={profile.bio}
              onChange={(value) => setProfile({ ...profile, bio: value })}
            />
          </div>
        </div>
        <PhotoUpload
          avatarUrl={profile.avatar_url}
          onPhotoChange={(file) => {
            setAvatarFile(file);
          }}
        />
        <div className="sm:col-span-3">
          <Label>Company/Institute</Label>
          <Input
            name="company"
            className="mt-2"
            value={profile.company}
            onChange={(e) => setProfile({ ...profile, company: e.target.value })}
          />
        </div>
        <div className="sm:col-span-3">
          <Label>Role/Position</Label>
          <Input
            name="role"
            className="mt-2"
            label="Role/Position"
            value={profile.role}
            onChange={(e) => setProfile({ ...profile, role: e.target.value })}
          />
        </div>
      </div>
    </FormBlock>
  );
};

export default ProfileSection;
