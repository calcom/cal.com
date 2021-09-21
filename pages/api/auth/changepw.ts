import { NextApiRequest, NextApiResponse } from "next";
import { requireUserSubject } from "@lib/auth";
import { service as identityService } from "@lib/business/identity";
import { IdentityServiceException } from "@lib/business/identity/IdentityServiceException";
import { UnauthorizedSubjectException } from "@lib/platform/authorization/UnauthorizedSubjectException";
import { UserSubject } from "@lib/platform/authorization/UserSubject";

async function changePassword(subject: UserSubject, req: NextApiRequest, res: NextApiResponse) {
  try {
    await identityService.changePassword(
      subject,
      subject.user.id,
      req.body.oldPassword,
      req.body.newPassword
    );
    return res.status(200).json({ message: "Password updated" });
  } catch (exception) {
    if (exception instanceof UnauthorizedSubjectException) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (exception instanceof IdentityServiceException) {
      return res.status(400).json({ error: exception.getErrorCode() });
    }
    throw exception;
  }
}

export default requireUserSubject(changePassword);
