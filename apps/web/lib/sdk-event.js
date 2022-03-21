/** @file
 * It can be moved to it's own package when other packages wants to fire an event or listen to one.
 * Automatically takes care of event namespace, so that no third party can accidentally interfere with our events.
 */

const eventNamespace = "Cal";

function getCustomEventName(name) {
  return eventNamespace ? `${eventNamespace}.${name}` : name;
}

function _fireEvent(fullName, detail) {
  const event = new window.CustomEvent(fullName, {
    detail: detail,
  });

  window.dispatchEvent(event);
}

export function fireEvent(name, data) {
  const fullName = getCustomEventName(name);
  const detail = {
    type: name,
    fullType: fullName,
    data,
  };

  _fireEvent(fullName, detail);

  // Wildcard Event
  _fireEvent(getCustomEventName("*"), detail);
}

export function addEventListener(name, callback) {
  const fullName = getCustomEventName(name);
  window.addEventListener(fullName, callback);
}
