# EditBookingByIdRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Title** | Pointer to **string** | Booking event title | [optional] 
**Start** | Pointer to **time.Time** | Start time of the Event | [optional] 
**End** | Pointer to **time.Time** | End time of the Event | [optional] 
**Status** | Pointer to **string** | Acceptable values one of [\&quot;ACCEPTED\&quot;, \&quot;PENDING\&quot;, \&quot;CANCELLED\&quot;, \&quot;REJECTED\&quot;] | [optional] 
**Description** | Pointer to **string** | Description of the meeting | [optional] 

## Methods

### NewEditBookingByIdRequest

`func NewEditBookingByIdRequest() *EditBookingByIdRequest`

NewEditBookingByIdRequest instantiates a new EditBookingByIdRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewEditBookingByIdRequestWithDefaults

`func NewEditBookingByIdRequestWithDefaults() *EditBookingByIdRequest`

NewEditBookingByIdRequestWithDefaults instantiates a new EditBookingByIdRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTitle

`func (o *EditBookingByIdRequest) GetTitle() string`

GetTitle returns the Title field if non-nil, zero value otherwise.

### GetTitleOk

`func (o *EditBookingByIdRequest) GetTitleOk() (*string, bool)`

GetTitleOk returns a tuple with the Title field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTitle

`func (o *EditBookingByIdRequest) SetTitle(v string)`

SetTitle sets Title field to given value.

### HasTitle

`func (o *EditBookingByIdRequest) HasTitle() bool`

HasTitle returns a boolean if a field has been set.

### GetStart

`func (o *EditBookingByIdRequest) GetStart() time.Time`

GetStart returns the Start field if non-nil, zero value otherwise.

### GetStartOk

`func (o *EditBookingByIdRequest) GetStartOk() (*time.Time, bool)`

GetStartOk returns a tuple with the Start field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStart

`func (o *EditBookingByIdRequest) SetStart(v time.Time)`

SetStart sets Start field to given value.

### HasStart

`func (o *EditBookingByIdRequest) HasStart() bool`

HasStart returns a boolean if a field has been set.

### GetEnd

`func (o *EditBookingByIdRequest) GetEnd() time.Time`

GetEnd returns the End field if non-nil, zero value otherwise.

### GetEndOk

`func (o *EditBookingByIdRequest) GetEndOk() (*time.Time, bool)`

GetEndOk returns a tuple with the End field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEnd

`func (o *EditBookingByIdRequest) SetEnd(v time.Time)`

SetEnd sets End field to given value.

### HasEnd

`func (o *EditBookingByIdRequest) HasEnd() bool`

HasEnd returns a boolean if a field has been set.

### GetStatus

`func (o *EditBookingByIdRequest) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *EditBookingByIdRequest) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *EditBookingByIdRequest) SetStatus(v string)`

SetStatus sets Status field to given value.

### HasStatus

`func (o *EditBookingByIdRequest) HasStatus() bool`

HasStatus returns a boolean if a field has been set.

### GetDescription

`func (o *EditBookingByIdRequest) GetDescription() string`

GetDescription returns the Description field if non-nil, zero value otherwise.

### GetDescriptionOk

`func (o *EditBookingByIdRequest) GetDescriptionOk() (*string, bool)`

GetDescriptionOk returns a tuple with the Description field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDescription

`func (o *EditBookingByIdRequest) SetDescription(v string)`

SetDescription sets Description field to given value.

### HasDescription

`func (o *EditBookingByIdRequest) HasDescription() bool`

HasDescription returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


