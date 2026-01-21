/**
 * Attendee lookup interface
 * 
 * This interface provides methods for looking up attendee information.
 */
export interface IAttendeeRepository {
    findById(id: number): Promise<{ name: string; email: string } | null>;
}

