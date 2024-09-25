import { Injectable, CanActivate, ExecutionContext, BadRequestException } from "@nestjs/common";

@Injectable()
export class BookingUidGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const bookingUid = request.params.bookingUid;

    if (!bookingUid) {
      throw new BadRequestException("Booking UID missing in the request path");
    }

    return true;
  }
}
