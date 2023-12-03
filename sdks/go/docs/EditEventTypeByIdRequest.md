# EditEventTypeByIdRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Length** | Pointer to **int32** | Duration of the event type in minutes | [optional] 
**Metadata** | Pointer to **map[string]interface{}** | Metadata relating to event type. Pass {} if empty | [optional] 
**Title** | Pointer to **string** | Title of the event type | [optional] 
**Slug** | Pointer to **string** | Unique slug for the event type | [optional] 
**ScheduleId** | Pointer to **float32** | The ID of the schedule for this event type | [optional] 
**Hosts** | Pointer to [**[]AddEventTypeRequestHostsInner**](AddEventTypeRequestHostsInner.md) |  | [optional] 
**Hidden** | Pointer to **bool** | If the event type should be hidden from your public booking page | [optional] 
**Position** | Pointer to **int32** | The position of the event type on the public booking page | [optional] 
**TeamId** | Pointer to **int32** | Team ID if the event type should belong to a team | [optional] 
**PeriodType** | Pointer to **string** | To decide how far into the future an invitee can book an event with you | [optional] 
**PeriodStartDate** | Pointer to **time.Time** | Start date of bookable period (Required if periodType is &#39;range&#39;) | [optional] 
**PeriodEndDate** | Pointer to **time.Time** | End date of bookable period (Required if periodType is &#39;range&#39;) | [optional] 
**PeriodDays** | Pointer to **int32** | Number of bookable days (Required if periodType is rolling) | [optional] 
**PeriodCountCalendarDays** | Pointer to **bool** | If calendar days should be counted for period days | [optional] 
**RequiresConfirmation** | Pointer to **bool** | If the event type should require your confirmation before completing the booking | [optional] 
**RecurringEvent** | Pointer to [**AddEventTypeRequestRecurringEvent**](AddEventTypeRequestRecurringEvent.md) |  | [optional] 
**DisableGuests** | Pointer to **bool** | If the event type should disable adding guests to the booking | [optional] 
**HideCalendarNotes** | Pointer to **bool** | If the calendar notes should be hidden from the booking | [optional] 
**MinimumBookingNotice** | Pointer to **int32** | Minimum time in minutes before the event is bookable | [optional] 
**BeforeEventBuffer** | Pointer to **int32** | Number of minutes of buffer time before a Cal Event | [optional] 
**AfterEventBuffer** | Pointer to **int32** | Number of minutes of buffer time after a Cal Event | [optional] 
**SchedulingType** | Pointer to **string** | The type of scheduling if a Team event. Required for team events only | [optional] 
**Price** | Pointer to **int32** | Price of the event type booking | [optional] 
**Currency** | Pointer to **string** | Currency acronym. Eg- usd, eur, gbp, etc. | [optional] 
**SlotInterval** | Pointer to **int32** | The intervals of available bookable slots in minutes | [optional] 
**SuccessRedirectUrl** | Pointer to **string** | A valid URL where the booker will redirect to, once the booking is completed successfully | [optional] 
**Description** | Pointer to **string** | Description of the event type | [optional] 
**SeatsPerTimeSlot** | Pointer to **int32** | The number of seats for each time slot | [optional] 
**SeatsShowAttendees** | Pointer to **bool** | Share Attendee information in seats | [optional] 
**SeatsShowAvailabilityCount** | Pointer to **bool** | Show the number of available seats | [optional] 
**Locations** | Pointer to [**[][]AddEventTypeRequestLocationsInnerInner**]([]AddEventTypeRequestLocationsInnerInner.md) | A list of all available locations for the event type | [optional] 

## Methods

### NewEditEventTypeByIdRequest

`func NewEditEventTypeByIdRequest() *EditEventTypeByIdRequest`

NewEditEventTypeByIdRequest instantiates a new EditEventTypeByIdRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewEditEventTypeByIdRequestWithDefaults

`func NewEditEventTypeByIdRequestWithDefaults() *EditEventTypeByIdRequest`

NewEditEventTypeByIdRequestWithDefaults instantiates a new EditEventTypeByIdRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetLength

`func (o *EditEventTypeByIdRequest) GetLength() int32`

GetLength returns the Length field if non-nil, zero value otherwise.

### GetLengthOk

`func (o *EditEventTypeByIdRequest) GetLengthOk() (*int32, bool)`

GetLengthOk returns a tuple with the Length field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLength

`func (o *EditEventTypeByIdRequest) SetLength(v int32)`

SetLength sets Length field to given value.

### HasLength

`func (o *EditEventTypeByIdRequest) HasLength() bool`

HasLength returns a boolean if a field has been set.

### GetMetadata

`func (o *EditEventTypeByIdRequest) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *EditEventTypeByIdRequest) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *EditEventTypeByIdRequest) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.

### HasMetadata

`func (o *EditEventTypeByIdRequest) HasMetadata() bool`

HasMetadata returns a boolean if a field has been set.

### GetTitle

`func (o *EditEventTypeByIdRequest) GetTitle() string`

GetTitle returns the Title field if non-nil, zero value otherwise.

### GetTitleOk

`func (o *EditEventTypeByIdRequest) GetTitleOk() (*string, bool)`

GetTitleOk returns a tuple with the Title field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTitle

`func (o *EditEventTypeByIdRequest) SetTitle(v string)`

SetTitle sets Title field to given value.

### HasTitle

`func (o *EditEventTypeByIdRequest) HasTitle() bool`

HasTitle returns a boolean if a field has been set.

### GetSlug

`func (o *EditEventTypeByIdRequest) GetSlug() string`

GetSlug returns the Slug field if non-nil, zero value otherwise.

### GetSlugOk

`func (o *EditEventTypeByIdRequest) GetSlugOk() (*string, bool)`

GetSlugOk returns a tuple with the Slug field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSlug

`func (o *EditEventTypeByIdRequest) SetSlug(v string)`

SetSlug sets Slug field to given value.

### HasSlug

`func (o *EditEventTypeByIdRequest) HasSlug() bool`

HasSlug returns a boolean if a field has been set.

### GetScheduleId

`func (o *EditEventTypeByIdRequest) GetScheduleId() float32`

GetScheduleId returns the ScheduleId field if non-nil, zero value otherwise.

### GetScheduleIdOk

`func (o *EditEventTypeByIdRequest) GetScheduleIdOk() (*float32, bool)`

GetScheduleIdOk returns a tuple with the ScheduleId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScheduleId

`func (o *EditEventTypeByIdRequest) SetScheduleId(v float32)`

SetScheduleId sets ScheduleId field to given value.

### HasScheduleId

`func (o *EditEventTypeByIdRequest) HasScheduleId() bool`

HasScheduleId returns a boolean if a field has been set.

### GetHosts

`func (o *EditEventTypeByIdRequest) GetHosts() []AddEventTypeRequestHostsInner`

GetHosts returns the Hosts field if non-nil, zero value otherwise.

### GetHostsOk

`func (o *EditEventTypeByIdRequest) GetHostsOk() (*[]AddEventTypeRequestHostsInner, bool)`

GetHostsOk returns a tuple with the Hosts field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHosts

`func (o *EditEventTypeByIdRequest) SetHosts(v []AddEventTypeRequestHostsInner)`

SetHosts sets Hosts field to given value.

### HasHosts

`func (o *EditEventTypeByIdRequest) HasHosts() bool`

HasHosts returns a boolean if a field has been set.

### GetHidden

`func (o *EditEventTypeByIdRequest) GetHidden() bool`

GetHidden returns the Hidden field if non-nil, zero value otherwise.

### GetHiddenOk

`func (o *EditEventTypeByIdRequest) GetHiddenOk() (*bool, bool)`

GetHiddenOk returns a tuple with the Hidden field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHidden

`func (o *EditEventTypeByIdRequest) SetHidden(v bool)`

SetHidden sets Hidden field to given value.

### HasHidden

`func (o *EditEventTypeByIdRequest) HasHidden() bool`

HasHidden returns a boolean if a field has been set.

### GetPosition

`func (o *EditEventTypeByIdRequest) GetPosition() int32`

GetPosition returns the Position field if non-nil, zero value otherwise.

### GetPositionOk

`func (o *EditEventTypeByIdRequest) GetPositionOk() (*int32, bool)`

GetPositionOk returns a tuple with the Position field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPosition

`func (o *EditEventTypeByIdRequest) SetPosition(v int32)`

SetPosition sets Position field to given value.

### HasPosition

`func (o *EditEventTypeByIdRequest) HasPosition() bool`

HasPosition returns a boolean if a field has been set.

### GetTeamId

`func (o *EditEventTypeByIdRequest) GetTeamId() int32`

GetTeamId returns the TeamId field if non-nil, zero value otherwise.

### GetTeamIdOk

`func (o *EditEventTypeByIdRequest) GetTeamIdOk() (*int32, bool)`

GetTeamIdOk returns a tuple with the TeamId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTeamId

`func (o *EditEventTypeByIdRequest) SetTeamId(v int32)`

SetTeamId sets TeamId field to given value.

### HasTeamId

`func (o *EditEventTypeByIdRequest) HasTeamId() bool`

HasTeamId returns a boolean if a field has been set.

### GetPeriodType

`func (o *EditEventTypeByIdRequest) GetPeriodType() string`

GetPeriodType returns the PeriodType field if non-nil, zero value otherwise.

### GetPeriodTypeOk

`func (o *EditEventTypeByIdRequest) GetPeriodTypeOk() (*string, bool)`

GetPeriodTypeOk returns a tuple with the PeriodType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPeriodType

`func (o *EditEventTypeByIdRequest) SetPeriodType(v string)`

SetPeriodType sets PeriodType field to given value.

### HasPeriodType

`func (o *EditEventTypeByIdRequest) HasPeriodType() bool`

HasPeriodType returns a boolean if a field has been set.

### GetPeriodStartDate

`func (o *EditEventTypeByIdRequest) GetPeriodStartDate() time.Time`

GetPeriodStartDate returns the PeriodStartDate field if non-nil, zero value otherwise.

### GetPeriodStartDateOk

`func (o *EditEventTypeByIdRequest) GetPeriodStartDateOk() (*time.Time, bool)`

GetPeriodStartDateOk returns a tuple with the PeriodStartDate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPeriodStartDate

`func (o *EditEventTypeByIdRequest) SetPeriodStartDate(v time.Time)`

SetPeriodStartDate sets PeriodStartDate field to given value.

### HasPeriodStartDate

`func (o *EditEventTypeByIdRequest) HasPeriodStartDate() bool`

HasPeriodStartDate returns a boolean if a field has been set.

### GetPeriodEndDate

`func (o *EditEventTypeByIdRequest) GetPeriodEndDate() time.Time`

GetPeriodEndDate returns the PeriodEndDate field if non-nil, zero value otherwise.

### GetPeriodEndDateOk

`func (o *EditEventTypeByIdRequest) GetPeriodEndDateOk() (*time.Time, bool)`

GetPeriodEndDateOk returns a tuple with the PeriodEndDate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPeriodEndDate

`func (o *EditEventTypeByIdRequest) SetPeriodEndDate(v time.Time)`

SetPeriodEndDate sets PeriodEndDate field to given value.

### HasPeriodEndDate

`func (o *EditEventTypeByIdRequest) HasPeriodEndDate() bool`

HasPeriodEndDate returns a boolean if a field has been set.

### GetPeriodDays

`func (o *EditEventTypeByIdRequest) GetPeriodDays() int32`

GetPeriodDays returns the PeriodDays field if non-nil, zero value otherwise.

### GetPeriodDaysOk

`func (o *EditEventTypeByIdRequest) GetPeriodDaysOk() (*int32, bool)`

GetPeriodDaysOk returns a tuple with the PeriodDays field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPeriodDays

`func (o *EditEventTypeByIdRequest) SetPeriodDays(v int32)`

SetPeriodDays sets PeriodDays field to given value.

### HasPeriodDays

`func (o *EditEventTypeByIdRequest) HasPeriodDays() bool`

HasPeriodDays returns a boolean if a field has been set.

### GetPeriodCountCalendarDays

`func (o *EditEventTypeByIdRequest) GetPeriodCountCalendarDays() bool`

GetPeriodCountCalendarDays returns the PeriodCountCalendarDays field if non-nil, zero value otherwise.

### GetPeriodCountCalendarDaysOk

`func (o *EditEventTypeByIdRequest) GetPeriodCountCalendarDaysOk() (*bool, bool)`

GetPeriodCountCalendarDaysOk returns a tuple with the PeriodCountCalendarDays field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPeriodCountCalendarDays

`func (o *EditEventTypeByIdRequest) SetPeriodCountCalendarDays(v bool)`

SetPeriodCountCalendarDays sets PeriodCountCalendarDays field to given value.

### HasPeriodCountCalendarDays

`func (o *EditEventTypeByIdRequest) HasPeriodCountCalendarDays() bool`

HasPeriodCountCalendarDays returns a boolean if a field has been set.

### GetRequiresConfirmation

`func (o *EditEventTypeByIdRequest) GetRequiresConfirmation() bool`

GetRequiresConfirmation returns the RequiresConfirmation field if non-nil, zero value otherwise.

### GetRequiresConfirmationOk

`func (o *EditEventTypeByIdRequest) GetRequiresConfirmationOk() (*bool, bool)`

GetRequiresConfirmationOk returns a tuple with the RequiresConfirmation field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRequiresConfirmation

`func (o *EditEventTypeByIdRequest) SetRequiresConfirmation(v bool)`

SetRequiresConfirmation sets RequiresConfirmation field to given value.

### HasRequiresConfirmation

`func (o *EditEventTypeByIdRequest) HasRequiresConfirmation() bool`

HasRequiresConfirmation returns a boolean if a field has been set.

### GetRecurringEvent

`func (o *EditEventTypeByIdRequest) GetRecurringEvent() AddEventTypeRequestRecurringEvent`

GetRecurringEvent returns the RecurringEvent field if non-nil, zero value otherwise.

### GetRecurringEventOk

`func (o *EditEventTypeByIdRequest) GetRecurringEventOk() (*AddEventTypeRequestRecurringEvent, bool)`

GetRecurringEventOk returns a tuple with the RecurringEvent field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRecurringEvent

`func (o *EditEventTypeByIdRequest) SetRecurringEvent(v AddEventTypeRequestRecurringEvent)`

SetRecurringEvent sets RecurringEvent field to given value.

### HasRecurringEvent

`func (o *EditEventTypeByIdRequest) HasRecurringEvent() bool`

HasRecurringEvent returns a boolean if a field has been set.

### GetDisableGuests

`func (o *EditEventTypeByIdRequest) GetDisableGuests() bool`

GetDisableGuests returns the DisableGuests field if non-nil, zero value otherwise.

### GetDisableGuestsOk

`func (o *EditEventTypeByIdRequest) GetDisableGuestsOk() (*bool, bool)`

GetDisableGuestsOk returns a tuple with the DisableGuests field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDisableGuests

`func (o *EditEventTypeByIdRequest) SetDisableGuests(v bool)`

SetDisableGuests sets DisableGuests field to given value.

### HasDisableGuests

`func (o *EditEventTypeByIdRequest) HasDisableGuests() bool`

HasDisableGuests returns a boolean if a field has been set.

### GetHideCalendarNotes

`func (o *EditEventTypeByIdRequest) GetHideCalendarNotes() bool`

GetHideCalendarNotes returns the HideCalendarNotes field if non-nil, zero value otherwise.

### GetHideCalendarNotesOk

`func (o *EditEventTypeByIdRequest) GetHideCalendarNotesOk() (*bool, bool)`

GetHideCalendarNotesOk returns a tuple with the HideCalendarNotes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHideCalendarNotes

`func (o *EditEventTypeByIdRequest) SetHideCalendarNotes(v bool)`

SetHideCalendarNotes sets HideCalendarNotes field to given value.

### HasHideCalendarNotes

`func (o *EditEventTypeByIdRequest) HasHideCalendarNotes() bool`

HasHideCalendarNotes returns a boolean if a field has been set.

### GetMinimumBookingNotice

`func (o *EditEventTypeByIdRequest) GetMinimumBookingNotice() int32`

GetMinimumBookingNotice returns the MinimumBookingNotice field if non-nil, zero value otherwise.

### GetMinimumBookingNoticeOk

`func (o *EditEventTypeByIdRequest) GetMinimumBookingNoticeOk() (*int32, bool)`

GetMinimumBookingNoticeOk returns a tuple with the MinimumBookingNotice field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMinimumBookingNotice

`func (o *EditEventTypeByIdRequest) SetMinimumBookingNotice(v int32)`

SetMinimumBookingNotice sets MinimumBookingNotice field to given value.

### HasMinimumBookingNotice

`func (o *EditEventTypeByIdRequest) HasMinimumBookingNotice() bool`

HasMinimumBookingNotice returns a boolean if a field has been set.

### GetBeforeEventBuffer

`func (o *EditEventTypeByIdRequest) GetBeforeEventBuffer() int32`

GetBeforeEventBuffer returns the BeforeEventBuffer field if non-nil, zero value otherwise.

### GetBeforeEventBufferOk

`func (o *EditEventTypeByIdRequest) GetBeforeEventBufferOk() (*int32, bool)`

GetBeforeEventBufferOk returns a tuple with the BeforeEventBuffer field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBeforeEventBuffer

`func (o *EditEventTypeByIdRequest) SetBeforeEventBuffer(v int32)`

SetBeforeEventBuffer sets BeforeEventBuffer field to given value.

### HasBeforeEventBuffer

`func (o *EditEventTypeByIdRequest) HasBeforeEventBuffer() bool`

HasBeforeEventBuffer returns a boolean if a field has been set.

### GetAfterEventBuffer

`func (o *EditEventTypeByIdRequest) GetAfterEventBuffer() int32`

GetAfterEventBuffer returns the AfterEventBuffer field if non-nil, zero value otherwise.

### GetAfterEventBufferOk

`func (o *EditEventTypeByIdRequest) GetAfterEventBufferOk() (*int32, bool)`

GetAfterEventBufferOk returns a tuple with the AfterEventBuffer field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAfterEventBuffer

`func (o *EditEventTypeByIdRequest) SetAfterEventBuffer(v int32)`

SetAfterEventBuffer sets AfterEventBuffer field to given value.

### HasAfterEventBuffer

`func (o *EditEventTypeByIdRequest) HasAfterEventBuffer() bool`

HasAfterEventBuffer returns a boolean if a field has been set.

### GetSchedulingType

`func (o *EditEventTypeByIdRequest) GetSchedulingType() string`

GetSchedulingType returns the SchedulingType field if non-nil, zero value otherwise.

### GetSchedulingTypeOk

`func (o *EditEventTypeByIdRequest) GetSchedulingTypeOk() (*string, bool)`

GetSchedulingTypeOk returns a tuple with the SchedulingType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSchedulingType

`func (o *EditEventTypeByIdRequest) SetSchedulingType(v string)`

SetSchedulingType sets SchedulingType field to given value.

### HasSchedulingType

`func (o *EditEventTypeByIdRequest) HasSchedulingType() bool`

HasSchedulingType returns a boolean if a field has been set.

### GetPrice

`func (o *EditEventTypeByIdRequest) GetPrice() int32`

GetPrice returns the Price field if non-nil, zero value otherwise.

### GetPriceOk

`func (o *EditEventTypeByIdRequest) GetPriceOk() (*int32, bool)`

GetPriceOk returns a tuple with the Price field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPrice

`func (o *EditEventTypeByIdRequest) SetPrice(v int32)`

SetPrice sets Price field to given value.

### HasPrice

`func (o *EditEventTypeByIdRequest) HasPrice() bool`

HasPrice returns a boolean if a field has been set.

### GetCurrency

`func (o *EditEventTypeByIdRequest) GetCurrency() string`

GetCurrency returns the Currency field if non-nil, zero value otherwise.

### GetCurrencyOk

`func (o *EditEventTypeByIdRequest) GetCurrencyOk() (*string, bool)`

GetCurrencyOk returns a tuple with the Currency field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCurrency

`func (o *EditEventTypeByIdRequest) SetCurrency(v string)`

SetCurrency sets Currency field to given value.

### HasCurrency

`func (o *EditEventTypeByIdRequest) HasCurrency() bool`

HasCurrency returns a boolean if a field has been set.

### GetSlotInterval

`func (o *EditEventTypeByIdRequest) GetSlotInterval() int32`

GetSlotInterval returns the SlotInterval field if non-nil, zero value otherwise.

### GetSlotIntervalOk

`func (o *EditEventTypeByIdRequest) GetSlotIntervalOk() (*int32, bool)`

GetSlotIntervalOk returns a tuple with the SlotInterval field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSlotInterval

`func (o *EditEventTypeByIdRequest) SetSlotInterval(v int32)`

SetSlotInterval sets SlotInterval field to given value.

### HasSlotInterval

`func (o *EditEventTypeByIdRequest) HasSlotInterval() bool`

HasSlotInterval returns a boolean if a field has been set.

### GetSuccessRedirectUrl

`func (o *EditEventTypeByIdRequest) GetSuccessRedirectUrl() string`

GetSuccessRedirectUrl returns the SuccessRedirectUrl field if non-nil, zero value otherwise.

### GetSuccessRedirectUrlOk

`func (o *EditEventTypeByIdRequest) GetSuccessRedirectUrlOk() (*string, bool)`

GetSuccessRedirectUrlOk returns a tuple with the SuccessRedirectUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSuccessRedirectUrl

`func (o *EditEventTypeByIdRequest) SetSuccessRedirectUrl(v string)`

SetSuccessRedirectUrl sets SuccessRedirectUrl field to given value.

### HasSuccessRedirectUrl

`func (o *EditEventTypeByIdRequest) HasSuccessRedirectUrl() bool`

HasSuccessRedirectUrl returns a boolean if a field has been set.

### GetDescription

`func (o *EditEventTypeByIdRequest) GetDescription() string`

GetDescription returns the Description field if non-nil, zero value otherwise.

### GetDescriptionOk

`func (o *EditEventTypeByIdRequest) GetDescriptionOk() (*string, bool)`

GetDescriptionOk returns a tuple with the Description field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDescription

`func (o *EditEventTypeByIdRequest) SetDescription(v string)`

SetDescription sets Description field to given value.

### HasDescription

`func (o *EditEventTypeByIdRequest) HasDescription() bool`

HasDescription returns a boolean if a field has been set.

### GetSeatsPerTimeSlot

`func (o *EditEventTypeByIdRequest) GetSeatsPerTimeSlot() int32`

GetSeatsPerTimeSlot returns the SeatsPerTimeSlot field if non-nil, zero value otherwise.

### GetSeatsPerTimeSlotOk

`func (o *EditEventTypeByIdRequest) GetSeatsPerTimeSlotOk() (*int32, bool)`

GetSeatsPerTimeSlotOk returns a tuple with the SeatsPerTimeSlot field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSeatsPerTimeSlot

`func (o *EditEventTypeByIdRequest) SetSeatsPerTimeSlot(v int32)`

SetSeatsPerTimeSlot sets SeatsPerTimeSlot field to given value.

### HasSeatsPerTimeSlot

`func (o *EditEventTypeByIdRequest) HasSeatsPerTimeSlot() bool`

HasSeatsPerTimeSlot returns a boolean if a field has been set.

### GetSeatsShowAttendees

`func (o *EditEventTypeByIdRequest) GetSeatsShowAttendees() bool`

GetSeatsShowAttendees returns the SeatsShowAttendees field if non-nil, zero value otherwise.

### GetSeatsShowAttendeesOk

`func (o *EditEventTypeByIdRequest) GetSeatsShowAttendeesOk() (*bool, bool)`

GetSeatsShowAttendeesOk returns a tuple with the SeatsShowAttendees field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSeatsShowAttendees

`func (o *EditEventTypeByIdRequest) SetSeatsShowAttendees(v bool)`

SetSeatsShowAttendees sets SeatsShowAttendees field to given value.

### HasSeatsShowAttendees

`func (o *EditEventTypeByIdRequest) HasSeatsShowAttendees() bool`

HasSeatsShowAttendees returns a boolean if a field has been set.

### GetSeatsShowAvailabilityCount

`func (o *EditEventTypeByIdRequest) GetSeatsShowAvailabilityCount() bool`

GetSeatsShowAvailabilityCount returns the SeatsShowAvailabilityCount field if non-nil, zero value otherwise.

### GetSeatsShowAvailabilityCountOk

`func (o *EditEventTypeByIdRequest) GetSeatsShowAvailabilityCountOk() (*bool, bool)`

GetSeatsShowAvailabilityCountOk returns a tuple with the SeatsShowAvailabilityCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSeatsShowAvailabilityCount

`func (o *EditEventTypeByIdRequest) SetSeatsShowAvailabilityCount(v bool)`

SetSeatsShowAvailabilityCount sets SeatsShowAvailabilityCount field to given value.

### HasSeatsShowAvailabilityCount

`func (o *EditEventTypeByIdRequest) HasSeatsShowAvailabilityCount() bool`

HasSeatsShowAvailabilityCount returns a boolean if a field has been set.

### GetLocations

`func (o *EditEventTypeByIdRequest) GetLocations() [][]AddEventTypeRequestLocationsInnerInner`

GetLocations returns the Locations field if non-nil, zero value otherwise.

### GetLocationsOk

`func (o *EditEventTypeByIdRequest) GetLocationsOk() (*[][]AddEventTypeRequestLocationsInnerInner, bool)`

GetLocationsOk returns a tuple with the Locations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLocations

`func (o *EditEventTypeByIdRequest) SetLocations(v [][]AddEventTypeRequestLocationsInnerInner)`

SetLocations sets Locations field to given value.

### HasLocations

`func (o *EditEventTypeByIdRequest) HasLocations() bool`

HasLocations returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


