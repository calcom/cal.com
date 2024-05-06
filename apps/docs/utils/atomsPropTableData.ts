type AtomsProp = {
    name: string;
    required: boolean;
    description: string
}

export enum Atoms {
    Gcal = "google calendar",
    Availability = "availability settings",
    Booker = "booker"
}

export const googleCalendarAtomPropsData: AtomsProp[] = [
    {name: 'className', required: false, description: 'To pass in custom classnames from outside for styling the atom'},
    {name: 'label', required: false, description: 'The label for the connect button'}, 
    {name: 'alreadyConnectedLabel', required: false, description: 'The label for the already connected button'}, 
    {name: 'onCheckError', required: false, description: 'A callback function to handle errors when checking the connection status'}
]

export const availabilitySettingsAtomPropsData: AtomsProp[] = [
    {name: 'id', required: false, description: `The id of the schedule which fetches a user's availability`},
    {name: 'labels', required: false, description: 'Helpful if you wanna pass in your own lables for i18n'},
    {name: 'customClassNames', required: false, description: 'To pass in custom classnames from outside for styling the atom'}, 
    {name: 'onUpdateSuccess', required: false, description: 'A callback function to handle updating user availability successfully'},
    {name: 'onUpdateError', required: false, description: 'A callback function that gets triggered when the user availability fails to update'}, 
    {name: 'onDeleteSuccess', required: false, description: 'A callback function that gets triggered when the user availability is deleted successfully'},
    {name: 'onDeleteError', required: false, description: 'A callback function that gets triggered when the user availability is not deleted successfully'}, 
]

export const bookerAtomPropsData: AtomsProp[] = [
    {name: 'username', required: true, description: 'Username of the person whose schedule is to be displayed'}, 
    {name: 'eventSlug', required: true, description: 'Unique slug created for a particular event'},
    {name: 'orgBannerUrl', required: false, description: `URL of a users current organization`},
    {name: 'customClassNames', required: false, description: 'To pass in custom classnames from outside for styling the atom'},
    {name: 'month', required: false, description: 'The exact month that we wanna display a users availability for. If no value is passed it defaults to the current month'}, 
    {name: 'selectedDate', required: false, description: 'Default selected date for which the slotpicker will always open'},
    {name: 'hideBranding', required: false, description: 'For hiding any branding on the booker'}, 
    {name: 'isAway', required: false, description: 'Sets the booker component to the away state'},
    {name: 'allowsDynamicBooking', required: false, description: 'Boolean to indicate if the bookig is a dynamic booking'}, 
    {name: 'bookingData', required: false, description: 'When rescheduling a booking, the current bookings data is passed in via this prop'}, 
    {name: 'isTeamEvent', required: false, description: 'Boolean to indicate if it is a team event. If this boolean is passed, we will only check team events with this slug and event slug'},
    {name: 'duration', required: false, description: 'Refers to a multiple-duration event-type. If not passed, we select the default value'}, 
    {name: 'durationConfig', required: false, description: 'Configures the selectable options for a multi-duration event type'},
    {name: 'hashedLink', required: false, description: 'Refers to the private link from event types page'}, 
    {name: 'isInstantMeeting', required: false, description: `Boolean to indicate if the booking is an instant meeting or not`},
    {name: 'rescheduleUid', required: true, description: 'A unique id that is generated at the time of rescheduling a booking'}, 
    {name: 'bookingUid', required: true, description: 'A unique id that is generated at the time of creating a booking'},
    {name: 'firstName', required: false, description: `First name of the attendee`},
    {name: 'lastName', required: false, description: 'Last name of the attendee'},
    {name: 'guests', required: false, description: 'Invite a guest to join a meeting'}, 
    {name: 'name', required: false, description: 'Host name'},
    {name: 'onCreateBookingSuccess', required: false, description: 'A callback function to handle successful creation of a booking'}, 
    {name: 'onCreateBookingError', required: false, description: 'A callback function that gets triggered when the booking creation process fails'},
    {name: 'onCreateRecurringBookingSuccess', required: false, description: 'A callback function to handle successful creation of a recurring booking'}, 
    {name: 'onCreateRecurringBookingError', required: false, description: 'A callback function that gets triggered when the process of creating a recurring booking fails'}, 
    {name: 'onCreateInstantBookingSuccess', required: false, description: 'A callback function to handle successful creation of an instant booking'},
    {name: 'onCreateInstantBookingError', required: false, description: 'A callback function that gets triggered when the process of creating an instant booking fails'}, 
    {name: 'onReserveSlotSuccess', required: false, description: 'A callback function to handle successful reservation of a slot'},
    {name: 'onReserveSlotError', required: false, description: 'A callback function that gets triggered when the process of reserving a slot fails'}, 
    {name: 'onDeleteSlotSuccess', required: false, description: 'A callback function to handle successful deletion of a slot'},
    {name: 'onDeleteSlotError', required: false, description: 'A callback function that gets triggered when the process of deleting a slot fails'}, 
]