TODO:
- Record a loom of Okta sync setup for Deel

Fixes Done:
- User update wasn't syncing custom attributes to the user
- Wrong username and name of user created through SCIM
- Ignore core user attributes in terms of syncing as custom attributes
- When creating a new attribute, OptionGroup was getting saved as regular Option itself.