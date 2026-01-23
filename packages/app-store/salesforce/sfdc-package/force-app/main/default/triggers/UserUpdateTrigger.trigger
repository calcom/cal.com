trigger UserUpdateTrigger on User (after update) {
    UserUpdateHandler.handleAfterUpdate(Trigger.oldMap, Trigger.newMap);
}
