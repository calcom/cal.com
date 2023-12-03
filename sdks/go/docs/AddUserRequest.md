# AddUserRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Email** | **string** | Email that belongs to the user being edited | 
**Username** | **string** | Username for the user being created | 
**BrandColor** | Pointer to **string** | The new user&#39;s brand color | [optional] 
**DarkBrandColor** | Pointer to **string** | The new user&#39;s brand color for dark mode | [optional] 
**HideBranding** | Pointer to **bool** | Remove branding from the user&#39;s calendar page | [optional] 
**WeekStart** | Pointer to **string** | Start of the week. Acceptable values are one of [SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY] | [optional] 
**TimeZone** | Pointer to **string** | The new user&#39;s time zone. Eg- &#39;EUROPE/PARIS&#39; | [optional] 
**Theme** | Pointer to **string** | Default theme for the new user. Acceptable values are one of [DARK, LIGHT] | [optional] 
**TimeFormat** | Pointer to **string** | The new user&#39;s time format. Acceptable values are one of [TWELVE, TWENTY_FOUR] | [optional] 
**Locale** | Pointer to **string** | The new user&#39;s locale. Acceptable values are one of [EN, FR, IT, RU, ES, DE, PT, RO, NL, PT_BR, ES_419, KO, JA, PL, AR, IW, ZH_CH, ZH_TW, CS, SR, SV, VI] | [optional] 
**Avatar** | Pointer to **string** | The user&#39;s avatar, in base64 format | [optional] 

## Methods

### NewAddUserRequest

`func NewAddUserRequest(email string, username string, ) *AddUserRequest`

NewAddUserRequest instantiates a new AddUserRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAddUserRequestWithDefaults

`func NewAddUserRequestWithDefaults() *AddUserRequest`

NewAddUserRequestWithDefaults instantiates a new AddUserRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetEmail

`func (o *AddUserRequest) GetEmail() string`

GetEmail returns the Email field if non-nil, zero value otherwise.

### GetEmailOk

`func (o *AddUserRequest) GetEmailOk() (*string, bool)`

GetEmailOk returns a tuple with the Email field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEmail

`func (o *AddUserRequest) SetEmail(v string)`

SetEmail sets Email field to given value.


### GetUsername

`func (o *AddUserRequest) GetUsername() string`

GetUsername returns the Username field if non-nil, zero value otherwise.

### GetUsernameOk

`func (o *AddUserRequest) GetUsernameOk() (*string, bool)`

GetUsernameOk returns a tuple with the Username field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUsername

`func (o *AddUserRequest) SetUsername(v string)`

SetUsername sets Username field to given value.


### GetBrandColor

`func (o *AddUserRequest) GetBrandColor() string`

GetBrandColor returns the BrandColor field if non-nil, zero value otherwise.

### GetBrandColorOk

`func (o *AddUserRequest) GetBrandColorOk() (*string, bool)`

GetBrandColorOk returns a tuple with the BrandColor field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBrandColor

`func (o *AddUserRequest) SetBrandColor(v string)`

SetBrandColor sets BrandColor field to given value.

### HasBrandColor

`func (o *AddUserRequest) HasBrandColor() bool`

HasBrandColor returns a boolean if a field has been set.

### GetDarkBrandColor

`func (o *AddUserRequest) GetDarkBrandColor() string`

GetDarkBrandColor returns the DarkBrandColor field if non-nil, zero value otherwise.

### GetDarkBrandColorOk

`func (o *AddUserRequest) GetDarkBrandColorOk() (*string, bool)`

GetDarkBrandColorOk returns a tuple with the DarkBrandColor field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDarkBrandColor

`func (o *AddUserRequest) SetDarkBrandColor(v string)`

SetDarkBrandColor sets DarkBrandColor field to given value.

### HasDarkBrandColor

`func (o *AddUserRequest) HasDarkBrandColor() bool`

HasDarkBrandColor returns a boolean if a field has been set.

### GetHideBranding

`func (o *AddUserRequest) GetHideBranding() bool`

GetHideBranding returns the HideBranding field if non-nil, zero value otherwise.

### GetHideBrandingOk

`func (o *AddUserRequest) GetHideBrandingOk() (*bool, bool)`

GetHideBrandingOk returns a tuple with the HideBranding field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHideBranding

`func (o *AddUserRequest) SetHideBranding(v bool)`

SetHideBranding sets HideBranding field to given value.

### HasHideBranding

`func (o *AddUserRequest) HasHideBranding() bool`

HasHideBranding returns a boolean if a field has been set.

### GetWeekStart

`func (o *AddUserRequest) GetWeekStart() string`

GetWeekStart returns the WeekStart field if non-nil, zero value otherwise.

### GetWeekStartOk

`func (o *AddUserRequest) GetWeekStartOk() (*string, bool)`

GetWeekStartOk returns a tuple with the WeekStart field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWeekStart

`func (o *AddUserRequest) SetWeekStart(v string)`

SetWeekStart sets WeekStart field to given value.

### HasWeekStart

`func (o *AddUserRequest) HasWeekStart() bool`

HasWeekStart returns a boolean if a field has been set.

### GetTimeZone

`func (o *AddUserRequest) GetTimeZone() string`

GetTimeZone returns the TimeZone field if non-nil, zero value otherwise.

### GetTimeZoneOk

`func (o *AddUserRequest) GetTimeZoneOk() (*string, bool)`

GetTimeZoneOk returns a tuple with the TimeZone field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimeZone

`func (o *AddUserRequest) SetTimeZone(v string)`

SetTimeZone sets TimeZone field to given value.

### HasTimeZone

`func (o *AddUserRequest) HasTimeZone() bool`

HasTimeZone returns a boolean if a field has been set.

### GetTheme

`func (o *AddUserRequest) GetTheme() string`

GetTheme returns the Theme field if non-nil, zero value otherwise.

### GetThemeOk

`func (o *AddUserRequest) GetThemeOk() (*string, bool)`

GetThemeOk returns a tuple with the Theme field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTheme

`func (o *AddUserRequest) SetTheme(v string)`

SetTheme sets Theme field to given value.

### HasTheme

`func (o *AddUserRequest) HasTheme() bool`

HasTheme returns a boolean if a field has been set.

### GetTimeFormat

`func (o *AddUserRequest) GetTimeFormat() string`

GetTimeFormat returns the TimeFormat field if non-nil, zero value otherwise.

### GetTimeFormatOk

`func (o *AddUserRequest) GetTimeFormatOk() (*string, bool)`

GetTimeFormatOk returns a tuple with the TimeFormat field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimeFormat

`func (o *AddUserRequest) SetTimeFormat(v string)`

SetTimeFormat sets TimeFormat field to given value.

### HasTimeFormat

`func (o *AddUserRequest) HasTimeFormat() bool`

HasTimeFormat returns a boolean if a field has been set.

### GetLocale

`func (o *AddUserRequest) GetLocale() string`

GetLocale returns the Locale field if non-nil, zero value otherwise.

### GetLocaleOk

`func (o *AddUserRequest) GetLocaleOk() (*string, bool)`

GetLocaleOk returns a tuple with the Locale field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLocale

`func (o *AddUserRequest) SetLocale(v string)`

SetLocale sets Locale field to given value.

### HasLocale

`func (o *AddUserRequest) HasLocale() bool`

HasLocale returns a boolean if a field has been set.

### GetAvatar

`func (o *AddUserRequest) GetAvatar() string`

GetAvatar returns the Avatar field if non-nil, zero value otherwise.

### GetAvatarOk

`func (o *AddUserRequest) GetAvatarOk() (*string, bool)`

GetAvatarOk returns a tuple with the Avatar field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAvatar

`func (o *AddUserRequest) SetAvatar(v string)`

SetAvatar sets Avatar field to given value.

### HasAvatar

`func (o *AddUserRequest) HasAvatar() bool`

HasAvatar returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


