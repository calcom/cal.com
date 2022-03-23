const min15Event = {
  id: 0,
  metadata: {},
  description: "",
  hidden: false,
  isWeb3Active: false,
  length: 15,
  price: 0,
  currency: "usd",
  schedulingType: "collective",
  slug: "15min",
  title: "15min",
};
const min30Event = {
  id: 0,
  metadata: {},
  description: "",
  hidden: false,
  isWeb3Active: false,
  length: 30,
  price: 0,
  currency: "usd",
  schedulingType: "collective",
  slug: "30min",
  title: "30min",
};
const min60Event = {
  id: 0,
  metadata: {},
  description: "",
  hidden: false,
  isWeb3Active: false,
  length: 60,
  price: 0,
  currency: "usd",
  schedulingType: "collective",
  slug: "60min",
  title: "60min",
};

const defaultEvents = [min15Event, min30Event, min60Event];
export const getUsernameSlugLink = ({ users, slug }): string => {
  let slugLink = ``;
  if (users.length > 1) {
    let combinedUsername = ``;
    for (let i = 0; i < users.length - 1; i++) {
      combinedUsername = `${users[i].username}+`;
    }
    combinedUsername = `${combinedUsername}${users[users.length - 1].username}`;
    slugLink = `/${combinedUsername}/${slug}`;
  } else {
    slugLink = `/${users[0].username}/${slug}`;
  }
  return slugLink;
};

export default defaultEvents;
