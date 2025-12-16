/**
 * Attendee lookup interface
 * 
 * This interface provides methods for looking up attendee information.
 */
export interface IAttendeeRepository {
    /**
     * Find an attendee by their ID
     * @param id - The attendee's database ID
     * @returns The attendee with name and email, or null if not found
     */
    findById(id: number): Promise<{ name: string; email: string } | null>;
}

