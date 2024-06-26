import { NextApiRequest, NextApiResponse } from 'next';
import { isUserMod, isUserPatron } from '../../../lib/patron.js';
import { UserInfoT } from '../../../lib/userinfo.js';

export default async function userinfo(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { userId } = req.query;
  if (Array.isArray(userId) || !userId) {
    res.status(404).json({ statusCode: 404, message: 'bad userid param' });
    return;
  }
  const isPatron = await isUserPatron(userId);
  const isMod = await isUserMod(userId);
  const ui: UserInfoT = { isPatron, isMod };
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Cache-Control', 'public, max-age=172800, s-maxage=172800');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(ui));
}
