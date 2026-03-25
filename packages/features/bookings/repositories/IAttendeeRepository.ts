/**
 * Attendee lookup interface
 *
 * This interface provides methods for looking up attendee information.
 */
export interface IAttendeeRepository {
  findById(id: number): Promise<{ name: string; email: string } | null>;
  findByIds({ ids }: { ids: number[] }): Promise<{ id: number; name: string; email: string }[]>;
}
