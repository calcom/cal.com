export class CalendarManager {
  constructor() {}
  
  static async getCalendar() {
    return {
      createEvent: jest.fn(),
      updateEvent: jest.fn(),
      deleteEvent: jest.fn(),
      getAvailability: jest.fn(),
      listCalendars: jest.fn(),
    };
  }
}

export default CalendarManager;
