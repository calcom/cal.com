- To be moved to proper documentation location

1. When a user is assigned to the integration in Okta, they are created in Cal.com with appropriate attributes.
2. Only attributes that are defined in Cal.com are synced.
    - Attributes are mapped by label, i.e., the external variable name of the custom attribute in Okta must match the label of the attribute in Cal.com (in a case-insensitive manner).
3. Only two types of custom attributes are currently supported (Number type support is pending):
   - string
   - array of strings
4. If an Okta custom attribute maps to a Multi-Select or Single-Select attribute in Cal.com, the provided values must be among the options defined for that attribute in Cal.com.
    - Options are matched by label in a case-insensitive manner, similar to attribute labels
    - Any option not defined on the attribute is ignored and not synced
5. If the attribute is locked in Cal.com, sync from Okta completely overrides the attribute's value for that user in Cal.com. Okta serves as the source of truth in this case.
    - After sync, no values will remain in Cal.com for that user's custom attribute unless they are defined in Okta.
6. If the attribute is not locked in Cal.com, the expectation is that the attribute is marked as 'Create Only' in Okta and shouldn't be synced back to Cal.com, after user's creation.
    - But in case if the attribute is still synced back to Cal.com, we handle it in following way:
        - We consider two pools of assignments for the attribute:
            - Directory Sync Pool: Assignments created by Directory Sync
            - Cal.com Pool: Assignments created by via Cal.com
        - A sync from Okta, would ensure that all assignments from Directory Sync Pool are removed and only those remain that are provided by Okta.
        - Any update in Cal.com is restricted to assignments in Cal.com Pool only and doesn't impact Directory Sync Pool.
        - In case an option already in Cal.com pool is assigned to a user through Directory sync, the ownership for that assignment is transferred to Directory Sync and it moves to Directory Sync Pool.
