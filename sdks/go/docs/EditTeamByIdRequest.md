# EditTeamByIdRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Name** | Pointer to **string** | Name of the team | [optional] 
**Slug** | Pointer to **string** | A unique slug that works as path for the team public page | [optional] 

## Methods

### NewEditTeamByIdRequest

`func NewEditTeamByIdRequest() *EditTeamByIdRequest`

NewEditTeamByIdRequest instantiates a new EditTeamByIdRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewEditTeamByIdRequestWithDefaults

`func NewEditTeamByIdRequestWithDefaults() *EditTeamByIdRequest`

NewEditTeamByIdRequestWithDefaults instantiates a new EditTeamByIdRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetName

`func (o *EditTeamByIdRequest) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *EditTeamByIdRequest) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *EditTeamByIdRequest) SetName(v string)`

SetName sets Name field to given value.

### HasName

`func (o *EditTeamByIdRequest) HasName() bool`

HasName returns a boolean if a field has been set.

### GetSlug

`func (o *EditTeamByIdRequest) GetSlug() string`

GetSlug returns the Slug field if non-nil, zero value otherwise.

### GetSlugOk

`func (o *EditTeamByIdRequest) GetSlugOk() (*string, bool)`

GetSlugOk returns a tuple with the Slug field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSlug

`func (o *EditTeamByIdRequest) SetSlug(v string)`

SetSlug sets Slug field to given value.

### HasSlug

`func (o *EditTeamByIdRequest) HasSlug() bool`

HasSlug returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


