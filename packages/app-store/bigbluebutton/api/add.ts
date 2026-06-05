// @ts-nocheck
export default async function handler(req, res) {
  return res.status(200).json({ url: "/apps/installed" });
}
