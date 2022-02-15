/**
 * Let define an App Integration.
 *
 * @type - App
 * @member {boolean} installed is used to indicate if the app is installed or not.
 * @member {string} type is used to indicate which type the app is.
 * @member {string} title is used to add a distinctive name
 * @member {string} name is the app's name.
 * @member {string} description is to add information about the app.
 * @member {string} imageSrc is to indicate where the app's logo is located.
 * @member {string} variant is to indicate to which classification the app belongs. It can be a `calendar`, `payment` or `conferencing` integration.
 */
export type App = {
  installed: boolean;
  type: `${string}_calendar` | `${string}_payment` | `${string}_video`;
  title: string;
  name: string;
  description: string;
  imageSrc: string;
  variant: "calendar" | "payment" | "conferencing";
};
