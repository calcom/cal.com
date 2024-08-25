// eslint-disable-next-line no-restricted-imports
import { transform, isEqual } from "lodash";

function deepDifference(origObj: object, newObj: object) {
  const changedAttribute: Array<keyof typeof newObj> = [];
  transform(newObj, function (_result, value, key: keyof typeof origObj) {
    if (!isEqual(value, origObj[key])) changedAttribute.push(key);
  });
  return changedAttribute;
}

export default deepDifference;
