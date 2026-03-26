public with sharing class CalComCalloutQueueable implements Queueable, Database.AllowsCallouts {

    private static final String ENDPOINT_PATH = '/api/integrations/salesforce/user-sync';

    private List<UserChangePayload> payloads;

    public CalComCalloutQueueable(List<UserChangePayload> payloads) {
        this.payloads = payloads;
    }

    public void execute(QueueableContext context) {
        String namedCredential = getNamedCredential();

        for (UserChangePayload payload : payloads) {
            sendPayload(namedCredential, payload);
        }
    }

    private String getNamedCredential() {
        Boolean isSandbox = [SELECT IsSandbox FROM Organization LIMIT 1].IsSandbox;
        return isSandbox ? 'callout:CalCom_Development' : 'callout:CalCom_Production';
    }

    private void sendPayload(String namedCredential, UserChangePayload payload) {
        try {
            HttpRequest req = new HttpRequest();
            req.setEndpoint(namedCredential + ENDPOINT_PATH);
            req.setMethod('POST');
            req.setHeader('Content-Type', 'application/json');
            req.setBody(JSON.serialize(payload));
            req.setTimeout(30000);

            Http http = new Http();
            HttpResponse res = http.send(req);

            if (res.getStatusCode() >= 200 && res.getStatusCode() < 300) {
                System.debug(LoggingLevel.INFO, 'Successfully sent user update to Cal.com for user: ' + payload.salesforceUserId);
            } else {
                System.debug(LoggingLevel.ERROR, 'Failed to send user update to Cal.com. Status: ' + res.getStatusCode() + ' Body: ' + res.getBody());
            }
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Exception sending user update to Cal.com: ' + e.getMessage());
        }
    }

    public class UserChangePayload {
        public Id salesforceUserId;
        public String email;
        public String instanceUrl;
        public String orgId;
        public Map<String, Object> changedFields;
        public String timestamp;
    }
}
