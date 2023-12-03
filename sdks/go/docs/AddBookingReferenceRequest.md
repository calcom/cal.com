# AddBookingReferenceRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Type** | **string** |  | 
**Uid** | **string** |  | 
**MeetingId** | Pointer to **string** |  | [optional] 
**MeetingPassword** | Pointer to **string** |  | [optional] 
**MeetingUrl** | Pointer to **string** |  | [optional] 
**BookingId** | Pointer to **bool** |  | [optional] 
**ExternalCalendarId** | Pointer to **string** |  | [optional] 
**Deleted** | Pointer to **bool** |  | [optional] 
**CredentialId** | Pointer to **int32** |  | [optional] 

## Methods

### NewAddBookingReferenceRequest

`func NewAddBookingReferenceRequest(type_ string, uid string, ) *AddBookingReferenceRequest`

NewAddBookingReferenceRequest instantiates a new AddBookingReferenceRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAddBookingReferenceRequestWithDefaults

`func NewAddBookingReferenceRequestWithDefaults() *AddBookingReferenceRequest`

NewAddBookingReferenceRequestWithDefaults instantiates a new AddBookingReferenceRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetType

`func (o *AddBookingReferenceRequest) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *AddBookingReferenceRequest) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *AddBookingReferenceRequest) SetType(v string)`

SetType sets Type field to given value.


### GetUid

`func (o *AddBookingReferenceRequest) GetUid() string`

GetUid returns the Uid field if non-nil, zero value otherwise.

### GetUidOk

`func (o *AddBookingReferenceRequest) GetUidOk() (*string, bool)`

GetUidOk returns a tuple with the Uid field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUid

`func (o *AddBookingReferenceRequest) SetUid(v string)`

SetUid sets Uid field to given value.


### GetMeetingId

`func (o *AddBookingReferenceRequest) GetMeetingId() string`

GetMeetingId returns the MeetingId field if non-nil, zero value otherwise.

### GetMeetingIdOk

`func (o *AddBookingReferenceRequest) GetMeetingIdOk() (*string, bool)`

GetMeetingIdOk returns a tuple with the MeetingId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMeetingId

`func (o *AddBookingReferenceRequest) SetMeetingId(v string)`

SetMeetingId sets MeetingId field to given value.

### HasMeetingId

`func (o *AddBookingReferenceRequest) HasMeetingId() bool`

HasMeetingId returns a boolean if a field has been set.

### GetMeetingPassword

`func (o *AddBookingReferenceRequest) GetMeetingPassword() string`

GetMeetingPassword returns the MeetingPassword field if non-nil, zero value otherwise.

### GetMeetingPasswordOk

`func (o *AddBookingReferenceRequest) GetMeetingPasswordOk() (*string, bool)`

GetMeetingPasswordOk returns a tuple with the MeetingPassword field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMeetingPassword

`func (o *AddBookingReferenceRequest) SetMeetingPassword(v string)`

SetMeetingPassword sets MeetingPassword field to given value.

### HasMeetingPassword

`func (o *AddBookingReferenceRequest) HasMeetingPassword() bool`

HasMeetingPassword returns a boolean if a field has been set.

### GetMeetingUrl

`func (o *AddBookingReferenceRequest) GetMeetingUrl() string`

GetMeetingUrl returns the MeetingUrl field if non-nil, zero value otherwise.

### GetMeetingUrlOk

`func (o *AddBookingReferenceRequest) GetMeetingUrlOk() (*string, bool)`

GetMeetingUrlOk returns a tuple with the MeetingUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMeetingUrl

`func (o *AddBookingReferenceRequest) SetMeetingUrl(v string)`

SetMeetingUrl sets MeetingUrl field to given value.

### HasMeetingUrl

`func (o *AddBookingReferenceRequest) HasMeetingUrl() bool`

HasMeetingUrl returns a boolean if a field has been set.

### GetBookingId

`func (o *AddBookingReferenceRequest) GetBookingId() bool`

GetBookingId returns the BookingId field if non-nil, zero value otherwise.

### GetBookingIdOk

`func (o *AddBookingReferenceRequest) GetBookingIdOk() (*bool, bool)`

GetBookingIdOk returns a tuple with the BookingId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBookingId

`func (o *AddBookingReferenceRequest) SetBookingId(v bool)`

SetBookingId sets BookingId field to given value.

### HasBookingId

`func (o *AddBookingReferenceRequest) HasBookingId() bool`

HasBookingId returns a boolean if a field has been set.

### GetExternalCalendarId

`func (o *AddBookingReferenceRequest) GetExternalCalendarId() string`

GetExternalCalendarId returns the ExternalCalendarId field if non-nil, zero value otherwise.

### GetExternalCalendarIdOk

`func (o *AddBookingReferenceRequest) GetExternalCalendarIdOk() (*string, bool)`

GetExternalCalendarIdOk returns a tuple with the ExternalCalendarId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExternalCalendarId

`func (o *AddBookingReferenceRequest) SetExternalCalendarId(v string)`

SetExternalCalendarId sets ExternalCalendarId field to given value.

### HasExternalCalendarId

`func (o *AddBookingReferenceRequest) HasExternalCalendarId() bool`

HasExternalCalendarId returns a boolean if a field has been set.

### GetDeleted

`func (o *AddBookingReferenceRequest) GetDeleted() bool`

GetDeleted returns the Deleted field if non-nil, zero value otherwise.

### GetDeletedOk

`func (o *AddBookingReferenceRequest) GetDeletedOk() (*bool, bool)`

GetDeletedOk returns a tuple with the Deleted field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDeleted

`func (o *AddBookingReferenceRequest) SetDeleted(v bool)`

SetDeleted sets Deleted field to given value.

### HasDeleted

`func (o *AddBookingReferenceRequest) HasDeleted() bool`

HasDeleted returns a boolean if a field has been set.

### GetCredentialId

`func (o *AddBookingReferenceRequest) GetCredentialId() int32`

GetCredentialId returns the CredentialId field if non-nil, zero value otherwise.

### GetCredentialIdOk

`func (o *AddBookingReferenceRequest) GetCredentialIdOk() (*int32, bool)`

GetCredentialIdOk returns a tuple with the CredentialId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCredentialId

`func (o *AddBookingReferenceRequest) SetCredentialId(v int32)`

SetCredentialId sets CredentialId field to given value.

### HasCredentialId

`func (o *AddBookingReferenceRequest) HasCredentialId() bool`

HasCredentialId returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


