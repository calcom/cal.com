# AddBookingRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**EventTypeId** | **int32** | ID of the event type to book | 
**Start** | **time.Time** | Start time of the Event | 
**End** | Pointer to **time.Time** | End time of the Event | [optional] 
**Responses** | [**AddBookingRequestResponses**](AddBookingRequestResponses.md) |  | 
**Metadata** | **map[string]interface{}** | Any metadata associated with the booking | 
**TimeZone** | **string** | TimeZone of the Attendee | 
**Language** | **string** | Language of the Attendee | 
**Title** | Pointer to **string** | Booking event title | [optional] 
**RecurringEventId** | Pointer to **int32** | Recurring event ID if the event is recurring | [optional] 
**Description** | Pointer to **string** | Event description | [optional] 
**Status** | Pointer to **string** | Acceptable values one of [\&quot;ACCEPTED\&quot;, \&quot;PENDING\&quot;, \&quot;CANCELLED\&quot;, \&quot;REJECTED\&quot;] | [optional] 
**SeatsPerTimeSlot** | Pointer to **int32** | The number of seats for each time slot | [optional] 
**SeatsShowAttendees** | Pointer to **bool** | Share Attendee information in seats | [optional] 
**SeatsShowAvailabilityCount** | Pointer to **bool** | Show the number of available seats | [optional] 
**SmsReminderNumber** | Pointer to **float32** | SMS reminder number | [optional] 

## Methods

### NewAddBookingRequest

`func NewAddBookingRequest(eventTypeId int32, start time.Time, responses AddBookingRequestResponses, metadata map[string]interface{}, timeZone string, language string, ) *AddBookingRequest`

NewAddBookingRequest instantiates a new AddBookingRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAddBookingRequestWithDefaults

`func NewAddBookingRequestWithDefaults() *AddBookingRequest`

NewAddBookingRequestWithDefaults instantiates a new AddBookingRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetEventTypeId

`func (o *AddBookingRequest) GetEventTypeId() int32`

GetEventTypeId returns the EventTypeId field if non-nil, zero value otherwise.

### GetEventTypeIdOk

`func (o *AddBookingRequest) GetEventTypeIdOk() (*int32, bool)`

GetEventTypeIdOk returns a tuple with the EventTypeId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventTypeId

`func (o *AddBookingRequest) SetEventTypeId(v int32)`

SetEventTypeId sets EventTypeId field to given value.


### GetStart

`func (o *AddBookingRequest) GetStart() time.Time`

GetStart returns the Start field if non-nil, zero value otherwise.

### GetStartOk

`func (o *AddBookingRequest) GetStartOk() (*time.Time, bool)`

GetStartOk returns a tuple with the Start field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStart

`func (o *AddBookingRequest) SetStart(v time.Time)`

SetStart sets Start field to given value.


### GetEnd

`func (o *AddBookingRequest) GetEnd() time.Time`

GetEnd returns the End field if non-nil, zero value otherwise.

### GetEndOk

`func (o *AddBookingRequest) GetEndOk() (*time.Time, bool)`

GetEndOk returns a tuple with the End field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEnd

`func (o *AddBookingRequest) SetEnd(v time.Time)`

SetEnd sets End field to given value.

### HasEnd

`func (o *AddBookingRequest) HasEnd() bool`

HasEnd returns a boolean if a field has been set.

### GetResponses

`func (o *AddBookingRequest) GetResponses() AddBookingRequestResponses`

GetResponses returns the Responses field if non-nil, zero value otherwise.

### GetResponsesOk

`func (o *AddBookingRequest) GetResponsesOk() (*AddBookingRequestResponses, bool)`

GetResponsesOk returns a tuple with the Responses field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetResponses

`func (o *AddBookingRequest) SetResponses(v AddBookingRequestResponses)`

SetResponses sets Responses field to given value.


### GetMetadata

`func (o *AddBookingRequest) GetMetadata() map[string]interface{}`

GetMetadata returns the Metadata field if non-nil, zero value otherwise.

### GetMetadataOk

`func (o *AddBookingRequest) GetMetadataOk() (*map[string]interface{}, bool)`

GetMetadataOk returns a tuple with the Metadata field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMetadata

`func (o *AddBookingRequest) SetMetadata(v map[string]interface{})`

SetMetadata sets Metadata field to given value.


### GetTimeZone

`func (o *AddBookingRequest) GetTimeZone() string`

GetTimeZone returns the TimeZone field if non-nil, zero value otherwise.

### GetTimeZoneOk

`func (o *AddBookingRequest) GetTimeZoneOk() (*string, bool)`

GetTimeZoneOk returns a tuple with the TimeZone field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimeZone

`func (o *AddBookingRequest) SetTimeZone(v string)`

SetTimeZone sets TimeZone field to given value.


### GetLanguage

`func (o *AddBookingRequest) GetLanguage() string`

GetLanguage returns the Language field if non-nil, zero value otherwise.

### GetLanguageOk

`func (o *AddBookingRequest) GetLanguageOk() (*string, bool)`

GetLanguageOk returns a tuple with the Language field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLanguage

`func (o *AddBookingRequest) SetLanguage(v string)`

SetLanguage sets Language field to given value.


### GetTitle

`func (o *AddBookingRequest) GetTitle() string`

GetTitle returns the Title field if non-nil, zero value otherwise.

### GetTitleOk

`func (o *AddBookingRequest) GetTitleOk() (*string, bool)`

GetTitleOk returns a tuple with the Title field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTitle

`func (o *AddBookingRequest) SetTitle(v string)`

SetTitle sets Title field to given value.

### HasTitle

`func (o *AddBookingRequest) HasTitle() bool`

HasTitle returns a boolean if a field has been set.

### GetRecurringEventId

`func (o *AddBookingRequest) GetRecurringEventId() int32`

GetRecurringEventId returns the RecurringEventId field if non-nil, zero value otherwise.

### GetRecurringEventIdOk

`func (o *AddBookingRequest) GetRecurringEventIdOk() (*int32, bool)`

GetRecurringEventIdOk returns a tuple with the RecurringEventId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRecurringEventId

`func (o *AddBookingRequest) SetRecurringEventId(v int32)`

SetRecurringEventId sets RecurringEventId field to given value.

### HasRecurringEventId

`func (o *AddBookingRequest) HasRecurringEventId() bool`

HasRecurringEventId returns a boolean if a field has been set.

### GetDescription

`func (o *AddBookingRequest) GetDescription() string`

GetDescription returns the Description field if non-nil, zero value otherwise.

### GetDescriptionOk

`func (o *AddBookingRequest) GetDescriptionOk() (*string, bool)`

GetDescriptionOk returns a tuple with the Description field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDescription

`func (o *AddBookingRequest) SetDescription(v string)`

SetDescription sets Description field to given value.

### HasDescription

`func (o *AddBookingRequest) HasDescription() bool`

HasDescription returns a boolean if a field has been set.

### GetStatus

`func (o *AddBookingRequest) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *AddBookingRequest) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *AddBookingRequest) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *AddBookingRequest) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### GetSeatsPerTimeSlot

`func (o *AddBookingRequest) GetSeatsPerTimeSlot() int32`

GetSeatsPerTimeSlot returns the SeatsPerTimeSlot field if non-nil, zero value otherwise.

### GetSeatsPerTimeSlotOk

`func (o *AddBookingRequest) GetSeatsPerTimeSlotOk() (*int32, bool)`

GetSeatsPerTimeSlotOk returns a tuple with the SeatsPerTimeSlot field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSeatsPerTimeSlot

`func (o *AddBookingRequest) SetSeatsPerTimeSlot(v int32)`

SetSeatsPerTimeSlot sets SeatsPerTimeSlot field to given value.

### HasSeatsPerTimeSlot

`func (o *AddBookingRequest) HasSeatsPerTimeSlot() bool`

HasSeatsPerTimeSlot returns a boolean if a field has been set.

### GetSeatsShowAttendees

`func (o *AddBookingRequest) GetSeatsShowAttendees() bool`

GetSeatsShowAttendees returns the SeatsShowAttendees field if non-nil, zero value otherwise.

### GetSeatsShowAttendeesOk

`func (o *AddBookingRequest) GetSeatsShowAttendeesOk() (*bool, bool)`

GetSeatsShowAttendeesOk returns a tuple with the SeatsShowAttendees field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSeatsShowAttendees

`func (o *AddBookingRequest) SetSeatsShowAttendees(v bool)`

SetSeatsShowAttendees sets SeatsShowAttendees field to given value.

### HasSeatsShowAttendees

`func (o *AddBookingRequest) HasSeatsShowAttendees() bool`

HasSeatsShowAttendees returns a boolean if a field has been set.

### GetSeatsShowAvailabilityCount

`func (o *AddBookingRequest) GetSeatsShowAvailabilityCount() bool`

GetSeatsShowAvailabilityCount returns the SeatsShowAvailabilityCount field if non-nil, zero value otherwise.

### GetSeatsShowAvailabilityCountOk

`func (o *AddBookingRequest) GetSeatsShowAvailabilityCountOk() (*bool, bool)`

GetSeatsShowAvailabilityCountOk returns a tuple with the SeatsShowAvailabilityCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSeatsShowAvailabilityCount

`func (o *AddBookingRequest) SetSeatsShowAvailabilityCount(v bool)`

SetSeatsShowAvailabilityCount sets SeatsShowAvailabilityCount field to given value.

### HasSeatsShowAvailabilityCount

`func (o *AddBookingRequest) HasSeatsShowAvailabilityCount() bool`

HasSeatsShowAvailabilityCount returns a boolean if a field has been set.

### GetSmsReminderNumber

`func (o *AddBookingRequest) GetSmsReminderNumber() float32`

GetSmsReminderNumber returns the SmsReminderNumber field if non-nil, zero value otherwise.

### GetSmsReminderNumberOk

`func (o *AddBookingRequest) GetSmsReminderNumberOk() (*float32, bool)`

GetSmsReminderNumberOk returns a tuple with the SmsReminderNumber field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSmsReminderNumber

`func (o *AddBookingRequest) SetSmsReminderNumber(v float32)`

SetSmsReminderNumber sets SmsReminderNumber field to given value.

### HasSmsReminderNumber

`func (o *AddBookingRequest) HasSmsReminderNumber() bool`

HasSmsReminderNumber returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


