import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cleanLink = (link) => {
  let cleanLink = link;

  if (cleanLink?.endsWith("/")) {
    cleanLink = cleanLink.slice(0, -1);
  }

  if (cleanLink?.includes("www.")) {
    cleanLink = cleanLink.replace("www.", "");
  }

  return cleanLink?.replace(/^https?\:\/\//i, "") ? cleanLink?.replace(/^https?\:\/\//i, "") : cleanLink;
};

export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

export const isValidLinkedInUrl = (url) => {
  const pattern = /^https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/;
  return pattern.test(url);
};

export const extractUserNameFromLinkedinUrl = (url) => {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  const trimmedPathname = pathname.replace(/^\/+|\/+$/g, "");
  const pathParts = trimmedPathname.split("/");
  if (pathParts.length >= 2 && pathParts[0] === "in") {
    return pathParts[1];
  }
  return null;
};

export const linkedinExperienceTransformer = (roles) => {
  const transformedData = [];
  const companies = {};

  for (const role of roles) {
    if (role.org_id && role.org_type !== "school") {
      if (!companies[role.org_id]) {
        companies[role.org_id] = {
          company: role.org_name,
          url: role.org_url,
          roles: [],
        };
      }

      const formattedRole = {
        title: role.role_job_title,
        start_date: role.role_start_date,
        end_date: role.role_end_date === null ? "Present" : role.role_end_date,
        description: role.role_description,
      };

      companies[role.org_id].roles.push(formattedRole);
    }
  }

  for (const companyId in companies) {
    transformedData.push(companies[companyId]);
  }

  return transformedData;
};

export const linkedinProjectsTransformer = (projects) => {
  const transformedData = [];

  for (const project of projects) {
    const formattedProject = {
      description: project?.description || "",
      title: project?.name || "",
      url: project?.url || "",
    };
    // if (!formattedProject.title) return;
    transformedData.push(formattedProject);
  }
  return transformedData || [];
};

export const linkedinPublicationsTransformer = (publications) => {
  const transformedData = [];
  for (const publication of publications) {
    const formattedPublication = {
      description: publication.description,
      title: publication.name,
      url: publication.url,
    };
    if (!formattedPublication.title) return;
    transformedData.push(formattedPublication);
  }
  return transformedData;
};

export const imageUrltoDataUrl = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.height = img.naturalHeight;
      canvas.width = img.naturalWidth;
      ctx.drawImage(img, 0, 0);
      const uri = canvas.toDataURL("image/png");
      resolve(uri);
    };
    img.onerror = reject;
    img.src = url;
  });
};

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
