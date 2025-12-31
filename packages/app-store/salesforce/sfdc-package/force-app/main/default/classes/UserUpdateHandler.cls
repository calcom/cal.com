public with sharing class UserUpdateHandler {

    public static void handleAfterUpdate(Map<Id, User> oldMap, Map<Id, User> newMap) {
        List<CalComCalloutQueueable.UserChangePayload> payloads = new List<CalComCalloutQueueable.UserChangePayload>();

        for (Id userId : newMap.keySet()) {
            User oldUser = oldMap.get(userId);
            User newUser = newMap.get(userId);

            Map<String, Object> changedFields = getChangedFields(oldUser, newUser);

            if (!changedFields.isEmpty()) {
                CalComCalloutQueueable.UserChangePayload payload = new CalComCalloutQueueable.UserChangePayload();
                payload.salesforceUserId = userId;
                payload.email = newUser.Email;
                payload.instanceUrl = URL.getOrgDomainUrl().toExternalForm();
                payload.orgId = UserInfo.getOrganizationId();
                payload.changedFields = changedFields;
                payload.timestamp = Datetime.now().formatGMT('yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'');
                payloads.add(payload);
            }
        }

        if (!payloads.isEmpty()) {
            System.enqueueJob(new CalComCalloutQueueable(payloads));
        }
    }

    private static Map<String, Object> getChangedFields(User oldUser, User newUser) {
        Map<String, Object> changedFields = new Map<String, Object>();

        Map<String, Object> oldFields = oldUser.getPopulatedFieldsAsMap();
        Map<String, Object> newFields = newUser.getPopulatedFieldsAsMap();

        for (String fieldName : newFields.keySet()) {
            Object oldValue = oldFields.get(fieldName);
            Object newValue = newFields.get(fieldName);

            if (oldValue != newValue) {
                changedFields.put(fieldName, newValue);
            }
        }

        return changedFields;
    }
}
