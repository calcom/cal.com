# \SelectedCalendarsAPI

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**EditSelectedCalendarById**](SelectedCalendarsAPI.md#EditSelectedCalendarById) | **Patch** /selected-calendars/{userId}_{integration}_{externalId} | Edit a selected calendar
[**GetSelectedCalendarById**](SelectedCalendarsAPI.md#GetSelectedCalendarById) | **Get** /selected-calendars/{userId}_{integration}_{externalId} | Find a selected calendar by providing the compoundId(userId_integration_externalId) separated by &#x60;_&#x60;
[**ListSelectedCalendars**](SelectedCalendarsAPI.md#ListSelectedCalendars) | **Get** /selected-calendars | Find all selected calendars
[**RemoveSelectedCalendarById**](SelectedCalendarsAPI.md#RemoveSelectedCalendarById) | **Delete** /selected-calendars/{userId}_{integration}_{externalId} | Remove a selected calendar
[**SelectedCalendarsPost**](SelectedCalendarsAPI.md#SelectedCalendarsPost) | **Post** /selected-calendars | Creates a new selected calendar



## EditSelectedCalendarById

> EditSelectedCalendarById(ctx, userId, externalId, integration).ApiKey(apiKey).Execute()

Edit a selected calendar

### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {
    apiKey := "apiKey_example" // string | Your API Key
    userId := int32(56) // int32 | userId of the selected calendar to get
    externalId := "externalId_example" // string | externalId of the selected calendar to get
    integration := "integration_example" // string | integration of the selected calendar to get

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.SelectedCalendarsAPI.EditSelectedCalendarById(context.Background(), userId, externalId, integration).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `SelectedCalendarsAPI.EditSelectedCalendarById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**userId** | **int32** | userId of the selected calendar to get | 
**externalId** | **string** | externalId of the selected calendar to get | 
**integration** | **string** | integration of the selected calendar to get | 

### Other Parameters

Other parameters are passed through a pointer to a apiEditSelectedCalendarByIdRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API Key | 




### Return type

 (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetSelectedCalendarById

> GetSelectedCalendarById(ctx, userId, externalId, integration).ApiKey(apiKey).Execute()

Find a selected calendar by providing the compoundId(userId_integration_externalId) separated by `_`

### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {
    apiKey := "apiKey_example" // string | Your API Key
    userId := int32(56) // int32 | userId of the selected calendar to get
    externalId := "externalId_example" // string | externalId of the selected calendar to get
    integration := "integration_example" // string | integration of the selected calendar to get

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.SelectedCalendarsAPI.GetSelectedCalendarById(context.Background(), userId, externalId, integration).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `SelectedCalendarsAPI.GetSelectedCalendarById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**userId** | **int32** | userId of the selected calendar to get | 
**externalId** | **string** | externalId of the selected calendar to get | 
**integration** | **string** | integration of the selected calendar to get | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetSelectedCalendarByIdRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API Key | 




### Return type

 (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ListSelectedCalendars

> ListSelectedCalendars(ctx).ApiKey(apiKey).Execute()

Find all selected calendars

### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {
    apiKey := "apiKey_example" // string | Your API Key

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.SelectedCalendarsAPI.ListSelectedCalendars(context.Background()).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `SelectedCalendarsAPI.ListSelectedCalendars``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiListSelectedCalendarsRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API Key | 

### Return type

 (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## RemoveSelectedCalendarById

> RemoveSelectedCalendarById(ctx, userId, externalId, integration).ApiKey(apiKey).Execute()

Remove a selected calendar

### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {
    apiKey := "apiKey_example" // string | Your API Key
    userId := int32(56) // int32 | userId of the selected calendar to get
    externalId := int32(56) // int32 | externalId of the selected-calendar to get
    integration := "integration_example" // string | integration of the selected calendar to get

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.SelectedCalendarsAPI.RemoveSelectedCalendarById(context.Background(), userId, externalId, integration).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `SelectedCalendarsAPI.RemoveSelectedCalendarById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**userId** | **int32** | userId of the selected calendar to get | 
**externalId** | **int32** | externalId of the selected-calendar to get | 
**integration** | **string** | integration of the selected calendar to get | 

### Other Parameters

Other parameters are passed through a pointer to a apiRemoveSelectedCalendarByIdRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API Key | 




### Return type

 (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## SelectedCalendarsPost

> SelectedCalendarsPost(ctx).ApiKey(apiKey).SelectedCalendarsPostRequest(selectedCalendarsPostRequest).Execute()

Creates a new selected calendar

### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {
    apiKey := "apiKey_example" // string | Your API Key
    selectedCalendarsPostRequest := *openapiclient.NewSelectedCalendarsPostRequest("Integration_example", "ExternalId_example") // SelectedCalendarsPostRequest | Create a new selected calendar

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.SelectedCalendarsAPI.SelectedCalendarsPost(context.Background()).ApiKey(apiKey).SelectedCalendarsPostRequest(selectedCalendarsPostRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `SelectedCalendarsAPI.SelectedCalendarsPost``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiSelectedCalendarsPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API Key | 
 **selectedCalendarsPostRequest** | [**SelectedCalendarsPostRequest**](SelectedCalendarsPostRequest.md) | Create a new selected calendar | 

### Return type

 (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

