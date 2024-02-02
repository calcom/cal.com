import type { LinkItemProps } from "@funnelhub/sidebar";
import { FaRobot, FaCalendarDay, FaVideo, FaFunnelDollar, FaWindowRestore } from "react-icons/fa";
import { FiHome, FiSettings } from "react-icons/fi";

const disabled = {
  pointerEvents: "none",
  cursor: "default",
  color: "gray",
};

export const sidebarMenuData = [
  { name: "Início", icon: FiHome, url: "https://app.funnelhub.io/", options: {} },
  { name: "CRM", icon: FaFunnelDollar, /* url: "https://localhost:3002/", */ options: disabled },
  { name: "Pages", icon: FaWindowRestore, /* url: "/#", */ options: disabled },
  { name: "Typebot", icon: FaRobot, url: "https://typebot.funnelhub.io/", options: {} },
  { name: "Cal.com", icon: FaCalendarDay, url: "/", options: {} },
  { name: "Mentoria", icon: FaVideo, /* url: "/#", */ options: disabled },
  { name: "Configurações", icon: FiSettings, /* url: "/#", */ options: disabled },
] as Array<LinkItemProps>;
