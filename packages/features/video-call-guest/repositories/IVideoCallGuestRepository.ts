export interface VideoCallGuestDto {
  id: number;
  bookingUid: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

export interface IVideoCallGuestRepository {
  upsertVideoCallGuest(params: {
    bookingUid: string;
    email: string;
    name: string;
  }): Promise<VideoCallGuestDto>;
}
