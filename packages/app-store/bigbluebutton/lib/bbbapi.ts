import crypto from 'node:crypto';

export function generateBBBUrl(
  endpoint: string,
  params: Record<string, string>,
  secret: string,
  baseUrl: string
): string {
  const query = new URLSearchParams(params).toString();
  const checksum = crypto.createHash('sha1').update(endpoint + query + secret).digest('hex');
  return `${baseUrl}/api/${endpoint}?${query}&checksum=${checksum}`;
}
