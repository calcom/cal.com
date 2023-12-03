# AddEventTypeRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Length** | **int32** | Duration of the event type in minutes | 
**Metadata** | **map[string]interface{}** | Metadata relating to event type. Pass {} if empty | 
**Title** | **string** | Title of the event type | 
**Slug** | **string** | Unique slug for the event type | 
**Hosts** | Pointer to [**[]AddEventTypeRequestHostsInner**](AddEventTypeRequestHostsInner.md) |  | [optional] 
**Hidden** | Pointer to **bool** | If the event type should be hidden from your public booking page | [optional] 
**ScheduleId** | Pointer to **float32** | The ID of the schedule for this event type | [optional] 
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
**ParentId** | Pointer to **int32** | EventTypeId of the parent managed event | [optional] 
**Currency** | Pointer to **string** | Currency acronym. Eg- usd, eur, gbp, etc. | [optional] 
**SlotInterval** | Pointer to **int32** | The intervals of available bookable slots in minutes | [optional] 
**SuccessRedirectUrl** | Pointer to **string** | A valid URL where the booker will redirect to, once the booking is completed successfully | [optional] 
**Description** | Pointer to **string** | Description of the event type | [optional] 
**Locations** | Pointer to [**[][]AddEventTypeRequestLocationsInnerInner**]([]AddEventTypeRequestLocationsInnerInner.md) | A list of all available locations for the event type | [optional] 

## Methods

### NewAddEventTypeRequest

`func NewAddEventTypeRequest(length int32, metadata map[string]interface{}, title string, slug string, ) *AddEventTypeRequest`

NewAddEventTypeRequest instantiates a new AddEventTypeRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAddEventTypeRequestWithDefaults

`func NewAddEventTypeRequestWithDefaults() *AddEventTypeRequest`

NewAddEventTypeRequestWithDefaults instantiates a new AddEventTypeRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetLength

`func (o *AddEventTypeRequest) GetLength() int32`

GetLength returns the Length field if non-nil, zero value otherwise.

### GetLengthOk

`func (o *AddEventTypeRequest) GetLengthOk() (*int32, bool)`

GetLengthOk returns a tuple with the Length field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLength

`func (o *AddEventTypeRequest) SetLength(v int32)`

SetLength sets Length field to given value.


### GetMetadata

`func (o *AddEventTypeRequest) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *AddEventTypeRequest) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *AddEventTypeRequest) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.


### GetTitle

`func (o *AddEventTypeRequest) GetTitle() string`

GetTitle returns the Title field if non-nil, zero value otherwise.

### GetTitleOk

`func (o *AddEventTypeRequest) GetTitleOk() (*string, bool)`

GetTitleOk returns a tuple with the Title field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTitle

`func (o *AddEventTypeRequest) SetTitle(v string)`

SetTitle sets Title field to given value.


### GetSlug

`func (o *AddEventTypeRequest) GetSlug() string`

GetSlug returns the Slug field if non-nil, zero value otherwise.

### GetSlugOk

`func (o *AddEventTypeRequest) GetSlugOk() (*string, bool)`

GetSlugOk returns a tuple with the Slug field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSlug

`func (o *AddEventTypeRequest) SetSlug(v string)`

SetSlug sets Slug field to given value.


### GetHosts

`func (o *AddEventTypeRequest) GetHosts() []AddEventTypeRequestHostsInner`

GetHosts returns the Hosts field if non-nil, zero value otherwise.

### GetHostsOk

`func (o *AddEventTypeRequest) GetHostsOk() (*[]AddEventTypeRequestHostsInner, bool)`

GetHostsOk returns a tuple with the Hosts field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHosts

`func (o *AddEventTypeRequest) SetHosts(v []AddEventTypeRequestHostsInner)`

SetHosts sets Hosts field to given value.

### HasHosts

`func (o *AddEventTypeRequest) HasHosts() bool`

HasHosts returns a boolean if a field has been set.

### GetHidden

`func (o *AddEventTypeRequest) GetHidden() bool`

GetHidden returns the Hidden field if non-nil, zero value otherwise.

### GetHiddenOk

`func (o *AddEventTypeRequest) GetHiddenOk() (*bool, bool)`

GetHiddenOk returns a tuple with the Hidden field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHidden

`func (o *AddEventTypeRequest) SetHidden(v bool)`

SetHidden sets Hidden field to given value.

### HasHidden

`func (o *AddEventTypeRequest) HasHidden() bool`

HasHidden returns a boolean if a field has been set.

### GetScheduleId

`func (o *AddEventTypeRequest) GetScheduleId() float32`

GetScheduleId returns the ScheduleId field if non-nil, zero value otherwise.

### GetScheduleIdOk

`func (o *AddEventTypeRequest) GetScheduleIdOk() (*float32, bool)`

GetScheduleIdOk returns a tuple with the ScheduleId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScheduleId

`func (o *AddEventTypeRequest) SetScheduleId(v float32)`

SetScheduleId sets ScheduleId field to given value.

### HasScheduleId

`func (o *AddEventTypeRequest) HasScheduleId() bool`

HasScheduleId returns a boolean if a field has been set.

### GetPosition

`func (o *AddEventTypeRequest) GetPosition() int32`

GetPosition returns the Position field if non-nil, zero value otherwise.

### GetPositionOk

`func (o *AddEventTypeRequest) GetPositionOk() (*int32, bool)`

GetPositionOk returns a tuple with the Position field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPosition

`func (o *AddEventTypeRequest) SetPosition(v int32)`

SetPosition sets Position field to given value.

### HasPosition

`func (o *AddEventTypeRequest) HasPosition() bool`

HasPosition returns a boolean if a field has been set.

### GetTeamId

`func (o *AddEventTypeRequest) GetTeamId() int32`

GetTeamId returns the TeamId field if non-nil, zero value otherwise.

### GetTeamIdOk

`func (o *AddEventTypeRequest) GetTeamIdOk() (*int32, bool)`

GetTeamIdOk returns a tuple with the TeamId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTeamId

`func (o *AddEventTypeRequest) SetTeamId(v int32)`

SetTeamId sets TeamId field to given value.

### HasTeamId

`func (o *AddEventTypeRequest) HasTeamId() bool`

HasTeamId returns a boolean if a field has been set.

### GetPeriodType

`func (o *AddEventTypeRequest) GetPeriodType() string`

GetPeriodType returns the PeriodType field if non-nil, zero value otherwise.

### GetPeriodTypeOk

`func (o *AddEventTypeRequest) GetPeriodTypeOk() (*string, bool)`

GetPeriodTypeOk returns a tuple with the PeriodType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPeriodType

`func (o *AddEventTypeRequest) SetPeriodType(v string)`

SetPeriodType sets PeriodType field to given value.

### HasPeriodType

`func (o *AddEventTypeRequest) HasPeriodType() bool`

HasPeriodType returns a boolean if a field has been set.

### GetPeriodStartDate

`func (o *AddEventTypeRequest) GetPeriodStartDate() time.Time`

GetPeriodStartDate returns the PeriodStartDate field if non-nil, zero value otherwise.

### GetPeriodStartDateOk

`func (o *AddEventTypeRequest) GetPeriodStartDateOk() (*time.Time, bool)`

GetPeriodStartDateOk returns a tuple with the PeriodStartDate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPeriodStartDate

`func (o *AddEventTypeRequest) SetPeriodStartDate(v time.Time)`

SetPeriodStartDate sets PeriodStartDate field to given value.

### HasPeriodStartDate

`func (o *AddEventTypeRequest) HasPeriodStartDate() bool`

HasPeriodStartDate returns a boolean if a field has been set.

### GetPeriodEndDate

`func (o *AddEventTypeRequest) GetPeriodEndDate() time.Time`

GetPeriodEndDate returns the PeriodEndDate field if non-nil, zero value otherwise.

### GetPeriodEndDateOk

`func (o *AddEventTypeRequest) GetPeriodEndDateOk() (*time.Time, bool)`

GetPeriodEndDateOk returns a tuple with the PeriodEndDate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPeriodEndDate

`func (o *AddEventTypeRequest) SetPeriodEndDate(v time.Time)`

SetPeriodEndDate sets PeriodEndDate field to given value.

### HasPeriodEndDate

`func (o *AddEventTypeRequest) HasPeriodEndDate() bool`

HasPeriodEndDate returns a boolean if a field has been set.

### GetPeriodDays

`func (o *AddEventTypeRequest) GetPeriodDays() int32`

GetPeriodDays returns the PeriodDays field if non-nil, zero value otherwise.

### GetPeriodDaysOk

`func (o *AddEventTypeRequest) GetPeriodDaysOk() (*int32, bool)`

GetPeriodDaysOk returns a tuple with the PeriodDays field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPeriodDays

`func (o *AddEventTypeRequest) SetPeriodDays(v int32)`

SetPeriodDays sets PeriodDays field to given value.

### HasPeriodDays

`func (o *AddEventTypeRequest) HasPeriodDays() bool`

HasPeriodDays returns a boolean if a field has been set.

### GetPeriodCountCalendarDays

`func (o *AddEventTypeRequest) GetPeriodCountCalendarDays() bool`

GetPeriodCountCalendarDays returns the PeriodCountCalendarDays field if non-nil, zero value otherwise.

### GetPeriodCountCalendarDaysOk

`func (o *AddEventTypeRequest) GetPeriodCountCalendarDaysOk() (*bool, bool)`

GetPeriodCountCalendarDaysOk returns a tuple with the PeriodCountCalendarDays field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPeriodCountCalendarDays

`func (o *AddEventTypeRequest) SetPeriodCountCalendarDays(v bool)`

SetPeriodCountCalendarDays sets PeriodCountCalendarDays field to given value.

### HasPeriodCountCalendarDays

`func (o *AddEventTypeRequest) HasPeriodCountCalendarDays() bool`

HasPeriodCountCalendarDays returns a boolean if a field has been set.

### GetRequiresConfirmation

`func (o *AddEventTypeRequest) GetRequiresConfirmation() bool`

GetRequiresConfirmation returns the RequiresConfirmation field if non-nil, zero value otherwise.

### GetRequiresConfirmationOk

`func (o *AddEventTypeRequest) GetRequiresConfirmationOk() (*bool, bool)`

GetRequiresConfirmationOk returns a tuple with the RequiresConfirmation field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRequiresConfirmation

`func (o *AddEventTypeRequest) SetRequiresConfirmation(v bool)`

SetRequiresConfirmation sets RequiresConfirmation field to given value.

### HasRequiresConfirmation

`func (o *AddEventTypeRequest) HasRequiresConfirmation() bool`

HasRequiresConfirmation returns a boolean if a field has been set.

### GetRecurringEvent

`func (o *AddEventTypeRequest) GetRecurringEvent() AddEventTypeRequestRecurringEvent`

GetRecurringEvent returns the RecurringEvent field if non-nil, zero value otherwise.

### GetRecurringEventOk

`func (o *AddEventTypeRequest) GetRecurringEventOk() (*AddEventTypeRequestRecurringEvent, bool)`

GetRecurringEventOk returns a tuple with the RecurringEvent field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRecurringEvent

`func (o *AddEventTypeRequest) SetRecurringEvent(v AddEventTypeRequestRecurringEvent)`

SetRecurringEvent sets RecurringEvent field to given value.

### HasRecurringEvent

`func (o *AddEventTypeRequest) HasRecurringEvent() bool`

HasRecurringEvent returns a boolean if a field has been set.

### GetDisableGuests

`func (o *AddEventTypeRequest) GetDisableGuests() bool`

GetDisableGuests returns the DisableGuests field if non-nil, zero value otherwise.

### GetDisableGuestsOk

`func (o *AddEventTypeRequest) GetDisableGuestsOk() (*bool, bool)`

GetDisableGuestsOk returns a tuple with the DisableGuests field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDisableGuests

`func (o *AddEventTypeRequest) SetDisableGuests(v bool)`

SetDisableGuests sets DisableGuests field to given value.

### HasDisableGuests

`func (o *AddEventTypeRequest) HasDisableGuests() bool`

HasDisableGuests returns a boolean if a field has been set.

### GetHideCalendarNotes

`func (o *AddEventTypeRequest) GetHideCalendarNotes() bool`

GetHideCalendarNotes returns the HideCalendarNotes field if non-nil, zero value otherwise.

### GetHideCalendarNotesOk

`func (o *AddEventTypeRequest) GetHideCalendarNotesOk() (*bool, bool)`

GetHideCalendarNotesOk returns a tuple with the HideCalendarNotes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHideCalendarNotes

`func (o *AddEventTypeRequest) SetHideCalendarNotes(v bool)`

SetHideCalendarNotes sets HideCalendarNotes field to given value.

### HasHideCalendarNotes

`func (o *AddEventTypeRequest) HasHideCalendarNotes() bool`

HasHideCalendarNotes returns a boolean if a field has been set.

### GetMinimumBookingNotice

`func (o *AddEventTypeRequest) GetMinimumBookingNotice() int32`

GetMinimumBookingNotice returns the MinimumBookingNotice field if non-nil, zero value otherwise.

### GetMinimumBookingNoticeOk

`func (o *AddEventTypeRequest) GetMinimumBookingNoticeOk() (*int32, bool)`

GetMinimumBookingNoticeOk returns a tuple with the MinimumBookingNotice field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMinimumBookingNotice

`func (o *AddEventTypeRequest) SetMinimumBookingNotice(v int32)`

SetMinimumBookingNotice sets MinimumBookingNotice field to given value.

### HasMinimumBookingNotice

`func (o *AddEventTypeRequest) HasMinimumBookingNotice() bool`

HasMinimumBookingNotice returns a boolean if a field has been set.

### GetBeforeEventBuffer

`func (o *AddEventTypeRequest) GetBeforeEventBuffer() int32`

GetBeforeEventBuffer returns the BeforeEventBuffer field if non-nil, zero value otherwise.

### GetBeforeEventBufferOk

`func (o *AddEventTypeRequest) GetBeforeEventBufferOk() (*int32, bool)`

GetBeforeEventBufferOk returns a tuple with the BeforeEventBuffer field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBeforeEventBuffer

`func (o *AddEventTypeRequest) SetBeforeEventBuffer(v int32)`

SetBeforeEventBuffer sets BeforeEventBuffer field to given value.

### HasBeforeEventBuffer

`func (o *AddEventTypeRequest) HasBeforeEventBuffer() bool`

HasBeforeEventBuffer returns a boolean if a field has been set.

### GetAfterEventBuffer

`func (o *AddEventTypeRequest) GetAfterEventBuffer() int32`

GetAfterEventBuffer returns the AfterEventBuffer field if non-nil, zero value otherwise.

### GetAfterEventBufferOk

`func (o *AddEventTypeRequest) GetAfterEventBufferOk() (*int32, bool)`

GetAfterEventBufferOk returns a tuple with the AfterEventBuffer field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAfterEventBuffer

`func (o *AddEventTypeRequest) SetAfterEventBuffer(v int32)`

SetAfterEventBuffer sets AfterEventBuffer field to given value.

### HasAfterEventBuffer

`func (o *AddEventTypeRequest) HasAfterEventBuffer() bool`

HasAfterEventBuffer returns a boolean if a field has been set.

### GetSchedulingType

`func (o *AddEventTypeRequest) GetSchedulingType() string`

GetSchedulingType returns the SchedulingType field if non-nil, zero value otherwise.

### GetSchedulingTypeOk

`func (o *AddEventTypeRequest) GetSchedulingTypeOk() (*string, bool)`

GetSchedulingTypeOk returns a tuple with the SchedulingType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSchedulingType

`func (o *AddEventTypeRequest) SetSchedulingType(v string)`

SetSchedulingType sets SchedulingType field to given value.

### HasSchedulingType

`func (o *AddEventTypeRequest) HasSchedulingType() bool`

HasSchedulingType returns a boolean if a field has been set.

### GetPrice

`func (o *AddEventTypeRequest) GetPrice() int32`

GetPrice returns the Price field if non-nil, zero value otherwise.

### GetPriceOk

`func (o *AddEventTypeRequest) GetPriceOk() (*int32, bool)`

GetPriceOk returns a tuple with the Price field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPrice

`func (o *AddEventTypeRequest) SetPrice(v int32)`

SetPrice sets Price field to given value.

### HasPrice

`func (o *AddEventTypeRequest) HasPrice() bool`

HasPrice returns a boolean if a field has been set.

### GetParentId

`func (o *AddEventTypeRequest) GetParentId() int32`

GetParentId returns the ParentId field if non-nil, zero value otherwise.

### GetParentIdOk

`func (o *AddEventTypeRequest) GetParentIdOk() (*int32, bool)`

GetParentIdOk returns a tuple with the ParentId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetParentId

`func (o *AddEventTypeRequest) SetParentId(v int32)`

SetParentId sets ParentId field to given value.

### HasParentId

`func (o *AddEventTypeRequest) HasParentId() bool`

HasParentId returns a boolean if a field has been set.

### GetCurrency

`func (o *AddEventTypeRequest) GetCurrency() string`

GetCurrency returns the Currency field if non-nil, zero value otherwise.

### GetCurrencyOk

`func (o *AddEventTypeRequest) GetCurrencyOk() (*string, bool)`

GetCurrencyOk returns a tuple with the Currency field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCurrency

`func (o *AddEventTypeRequest) SetCurrency(v string)`

SetCurrency sets Currency field to given value.

### HasCurrency

`func (o *AddEventTypeRequest) HasCurrency() bool`

HasCurrency returns a boolean if a field has been set.

### GetSlotInterval

`func (o *AddEventTypeRequest) GetSlotInterval() int32`

GetSlotInterval returns the SlotInterval field if non-nil, zero value otherwise.

### GetSlotIntervalOk

`func (o *AddEventTypeRequest) GetSlotIntervalOk() (*int32, bool)`

GetSlotIntervalOk returns a tuple with the SlotInterval field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSlotInterval

`func (o *AddEventTypeRequest) SetSlotInterval(v int32)`

SetSlotInterval sets SlotInterval field to given value.

### HasSlotInterval

`func (o *AddEventTypeRequest) HasSlotInterval() bool`

HasSlotInterval returns a boolean if a field has been set.

### GetSuccessRedirectUrl

`func (o *AddEventTypeRequest) GetSuccessRedirectUrl() string`

GetSuccessRedirectUrl returns the SuccessRedirectUrl field if non-nil, zero value otherwise.

### GetSuccessRedirectUrlOk

`func (o *AddEventTypeRequest) GetSuccessRedirectUrlOk() (*string, bool)`

GetSuccessRedirectUrlOk returns a tuple with the SuccessRedirectUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSuccessRedirectUrl

`func (o *AddEventTypeRequest) SetSuccessRedirectUrl(v string)`

SetSuccessRedirectUrl sets SuccessRedirectUrl field to given value.

### HasSuccessRedirectUrl

`func (o *AddEventTypeRequest) HasSuccessRedirectUrl() bool`

HasSuccessRedirectUrl returns a boolean if a field has been set.

### GetDescription

`func (o *AddEventTypeRequest) GetDescription() string`

GetDescription returns the Description field if non-nil, zero value otherwise.

### GetDescriptionOk

`func (o *AddEventTypeRequest) GetDescriptionOk() (*string, bool)`

GetDescriptionOk returns a tuple with the Description field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDescription

`func (o *AddEventTypeRequest) SetDescription(v string)`

SetDescription sets Description field to given value.

### HasDescription

`func (o *AddEventTypeRequest) HasDescription() bool`

HasDescription returns a boolean if a field has been set.

### GetLocations

`func (o *AddEventTypeRequest) GetLocations() [][]AddEventTypeRequestLocationsInnerInner`

GetLocations returns the Locations field if non-nil, zero value otherwise.

### GetLocationsOk

`func (o *AddEventTypeRequest) GetLocationsOk() (*[][]AddEventTypeRequestLocationsInnerInner, bool)`

GetLocationsOk returns a tuple with the Locations field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLocations

`func (o *AddEventTypeRequest) SetLocations(v [][]AddEventTypeRequestLocationsInnerInner)`

SetLocations sets Locations field to given value.

### HasLocations

`func (o *AddEventTypeRequest) HasLocations() bool`

HasLocations returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


