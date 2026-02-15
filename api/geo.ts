import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const lat = req.headers['x-vercel-ip-latitude'] as string | undefined;
  const lng = req.headers['x-vercel-ip-longitude'] as string | undefined;
  const city = req.headers['x-vercel-ip-city'] as string | undefined;

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    lat: lat ? Number(lat) : null,
    lng: lng ? Number(lng) : null,
    city: city ? decodeURIComponent(city) : null,
  });
}
