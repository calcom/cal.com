/**
 * A correctly typed version of Object.Keys
 * @url https://twitter.com/mpocock1/status/1502264005251018754
 */
export const objectKeys = <Obj extends object>(obj: Obj) => Object.keys(obj) as (keyof Obj)[];

export default objectKeys;
