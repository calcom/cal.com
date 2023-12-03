import { z } from "zod";
import { create } from "zustand";

const SeatUpdateSchema = z.object({
  ts: z.string().datetime(),
  seatsLeft: z.number(),
});

export type SeatUpdate = z.infer<typeof SeatUpdateSchema>;

interface RemainingSeatsData {
  [timestamp: string]: number;
}

interface RemainingSeatsStore {
  data: RemainingSeatsData;
  processUpdate: (seatUpdate: SeatUpdate) => void;
}

export const useRemainingSeatsStore = create<RemainingSeatsStore>((set) => ({
  data: {},
  processUpdate: (seatUpdate) => {
    set((state) => {
      const res = SeatUpdateSchema.safeParse(seatUpdate);
      if (!res.success) {
        return state;
      }
      const updateData = res.data;
      const { ts, seatsLeft } = updateData;
      const data = { ...state.data };
      data[ts] = seatsLeft;
      console.log("processed", data);
      return { data };
    });
  },
}));
