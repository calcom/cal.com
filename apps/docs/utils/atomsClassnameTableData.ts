type AtomsClassnamesProp = {
    name: string;
    description: string
}

export const googleCalendarAtomClassnamesPropData: AtomsClassnamesProp[] = [
    {name: 'className', description: 'Pass in custom classnames from outside for styling the button'},
]

export const availabilitySettingsAtomClassnamesPropData: AtomsClassnamesProp[] = [
    {name: 'containerClassName', description: 'Adds styling to the whole availability settings component'},
    {name: 'ctaClassName', description: 'Adds stylings only to certain call to action buttons'}, 
    {name: 'editableHeadingClassName', description: 'Editable heading or title can be styled'}, 
    {name: 'formClassName', description: 'Form which contains the days and toggles'},
    {name: 'timezoneSelectClassName', description: 'Adds styling to the timezone select component'},
    {name: 'subtitlesClassName', description: 'Styles the subtitle'}, 
    {name: 'scheduleContainer', description: 'Styles the whole of the schedule component'}, 
    {name: 'scheduleDay', description: 'Adds styling to just the day of a particular schedule'},
    {name: 'dayRanges', description: 'Adds styling to day ranges'}, 
    {name: 'timeRanges', description: 'Time ranges in the availability settings can be customized'}, 
    {name: 'labelAndSwitchContainer', description: 'Adds styling to label and switches'}
]

export const bookerAtomPropsClassnamesPropData: AtomsClassnamesProp[] = [
    {name: 'bookerContainer', description: 'Adds styling to the whole of booker atom'},
    {name: 'eventMetaContainer', description: 'Styles the event meta component containing details about an event'}, 
    {name: 'eventMetaTitle', description: 'Adds styles to the event meta title'}, 
    {name: 'eventMetaTimezoneSelect', description: 'Adds styles to the event meta timezone selector'},
    {name: 'datePickerContainer', description: 'Adds styling to the date picker'},
    {name: 'datePickerTitle', description: 'Styles the date picker title'}, 
    {name: 'datePickerDays', description: 'Adds styling to all days in the date picker'}, 
    {name: 'datePickerDate', description: 'Adds styling to all date in the date picker'},
    {name: 'datePickerDatesActive', description: 'Styles only the dates where a user has an available slot'},
    {name: 'datePickerToggle', description: 'Styles the left and right toggle buttons'}, 
    {name: 'availableTimeSlotsContainer', description: 'Adds styling to available time slots component'}, 
    {name: 'availableTimeSlotsHeaderContainer', description: 'Styles only the header container'},
    {name: 'availableTimeSlotsTitle', description: 'Adds styles to the title'}, 
    {name: 'availableTimeSlotsTimeFormatToggle', description: 'Adds styles to the format toggle buttons'}, 
    {name: 'availableTimes', description: 'Styles all the available times container'}
]