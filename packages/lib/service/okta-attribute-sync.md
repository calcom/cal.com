- To be moved to proper documentation place

1. When a user is assigned in Okta to the integration, the user is created in Cal with appropriate attributes.
2. Only those attributes are synced which are defined in Cal.com. Attributes are mapped by label i.e. external variable name of the custom attribute in Okta must match the label of the attribute in Cal.com(in case insensitive manner).
3. Two types of custom attributes are supported:
   - string
   - array of strings
4. If the custom attribute of Okta maps to a multi-select attribute in Cal.com, the values provided must be one of the options defined for that attribute in Cal.com. Again, the options are matched by label in a case insensitive manner.
    - Any option that isn't defined on the attribute is ignored.
5. If the attribute is locked in Cal.com, it completely overrides the value of the attribute for that user in Cal.com. Okta is the source of truth in this case. No other value that isn't defined in Okta for that user's custom attribute will be left in Cal.com on sync

