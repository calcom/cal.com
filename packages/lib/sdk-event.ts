// We can't use sdkActionManager without embed because sdkActionManager needs embed namespace to be able to inform the correct embed namespace in parent
// We should plan to create 2 sdkActionManager instances and fire events on both of them if we want to remove dependency on embed
// Because right now(and in near future) we need only those events which are fired from embed, we are fine
export { sdkActionManager } from "@calcom/embed-core/embed-iframe";
