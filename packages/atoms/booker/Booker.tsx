import type { BookerProps } from "@calcom/features/bookings/Booker";

import type { AtomsGlobalConfigProps } from "../types";
import { BookerWebWrapper as BookerComponent } from "./wrappers/BookerWebWrapper";

type BookerAtomProps = BookerProps & AtomsGlobalConfigProps;

/**
 * @TODO Before we can turn this into a reusable atom
 * * Use the webAppUrl coming from AtomsGlobalConfigProps to make url dynamic
 * * Find a solution for translations
 */
export const Booker = (props: BookerAtomProps) => <BookerComponent {...props} />;
