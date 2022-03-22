/** @file
 *
 * Right now event and action both terms are referring to a custom event, because we are in Event space. It becomes confusing, so we would be using the term `action` instead. Everywhere we see `event` we would replace it with `action`
 *
 *
 * It can be moved to it's own package when other packages wants to fire an event or listen to one.
 * Automatically takes care of event namespace, so that no third party can accidentally interfere with our events.
 */
export class SdkEventManager {
  static parseAction(fullType) {
    if (!fullType) {
      return null;
    }
    //FIXME: Ensure that any action if it has :, it is properly encoded.
    const [cal, calNamespace, type] = fullType.split(":");
    if (cal !== "CAL") {
      return null;
    }
    return {
      ns: calNamespace,
      type,
    };
  }
  getFullEventName(name) {
    return this.namespace ? `CAL:${this.namespace}:${name}` : `CAL::${name}`;
  }

  fire(name, data) {
    const fullName = this.getFullEventName(name);
    const detail = {
      type: name,
      namespace: this.namespace,
      fullType: fullName,
      data,
    };

    _fireEvent(fullName, detail);

    // Wildcard Event
    _fireEvent(this.getFullEventName("*"), detail);
  }

  on(name, callback) {
    const fullName = this.getFullEventName(name);
    window.addEventListener(fullName, callback);
  }
  constructor(ns) {
    ns = ns || "";
    this.namespace = ns;
  }
}

function _fireEvent(fullName, detail) {
  const event = new window.CustomEvent(fullName, {
    detail: detail,
  });

  window.dispatchEvent(event);
}
