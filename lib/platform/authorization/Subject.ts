import { UserSubject } from "./UserSubject";
import { VisitorSubject } from "./VisitorSubject";

/**
 * Subject identifies the entity making a request
 */
export type Subject = UserSubject | VisitorSubject;
