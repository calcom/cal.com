# \AvailabilityAPI

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**TeamAvailability**](AvailabilityAPI.md#TeamAvailability) | **Get** /teams/{teamId}/availability | Find team availability
[**UserAvailability**](AvailabilityAPI.md#UserAvailability) | **Get** /availability | Find user availability



## TeamAvailability

> map[string]interface{} TeamAvailability(ctx, teamId).ApiKey(apiKey).DateFrom(dateFrom).DateTo(dateTo).EventTypeId(eventTypeId).Execute()

Find team availability

### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    "time"
    openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {
    apiKey := "1234abcd5678efgh" // string | Your API key
    teamId := int32(123) // int32 | ID of the team to fetch the availability for
    dateFrom := time.Now() // string | Start Date of the availability query (optional)
    dateTo := time.Now() // string | End Date of the availability query (optional)
    eventTypeId := int32(123) // int32 | Event Type ID of the event type to fetch the availability for (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.AvailabilityAPI.TeamAvailability(context.Background(), teamId).ApiKey(apiKey).DateFrom(dateFrom).DateTo(dateTo).EventTypeId(eventTypeId).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AvailabilityAPI.TeamAvailability``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `TeamAvailability`: map[string]interface{}
    fmt.Fprintf(os.Stdout, "Response from `AvailabilityAPI.TeamAvailability`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**teamId** | **int32** | ID of the team to fetch the availability for | 

### Other Parameters

Other parameters are passed through a pointer to a apiTeamAvailabilityRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API key | 

 **dateFrom** | **string** | Start Date of the availability query | 
 **dateTo** | **string** | End Date of the availability query | 
 **eventTypeId** | **int32** | Event Type ID of the event type to fetch the availability for | 

### Return type

**map[string]interface{}**

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## UserAvailability

> map[string]interface{} UserAvailability(ctx).ApiKey(apiKey).UserId(userId).Username(username).DateFrom(dateFrom).DateTo(dateTo).EventTypeId(eventTypeId).Execute()

Find user availability

### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    "time"
    openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {
    apiKey := "1234abcd5678efgh" // string | Your API key
    userId := int32(101) // int32 | ID of the user to fetch the availability for (optional)
    username := "alice" // string | username of the user to fetch the availability for (optional)
    dateFrom := time.Now() // string | Start Date of the availability query (optional)
    dateTo := time.Now() // string | End Date of the availability query (optional)
    eventTypeId := int32(123) // int32 | Event Type ID of the event type to fetch the availability for (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.AvailabilityAPI.UserAvailability(context.Background()).ApiKey(apiKey).UserId(userId).Username(username).DateFrom(dateFrom).DateTo(dateTo).EventTypeId(eventTypeId).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AvailabilityAPI.UserAvailability``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `UserAvailability`: map[string]interface{}
    fmt.Fprintf(os.Stdout, "Response from `AvailabilityAPI.UserAvailability`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiUserAvailabilityRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API key | 
 **userId** | **int32** | ID of the user to fetch the availability for | 
 **username** | **string** | username of the user to fetch the availability for | 
 **dateFrom** | **string** | Start Date of the availability query | 
 **dateTo** | **string** | End Date of the availability query | 
 **eventTypeId** | **int32** | Event Type ID of the event type to fetch the availability for | 

### Return type

**map[string]interface{}**

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

