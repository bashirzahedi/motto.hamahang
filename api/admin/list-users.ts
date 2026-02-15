import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_helpers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify Supabase access token
  const { data: { user: authUser }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !authUser) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Check super admin status
  const { data: admin } = await supabaseAdmin
    .from('admin_users')
    .select('is_super_admin')
    .eq('user_id', authUser.id)
    .eq('is_active', true)
    .single();

  if (!admin?.is_super_admin) {
    return res.status(403).json({ error: 'Super admin required' });
  }

  const { data, error: listError } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .order('created_at', { ascending: true });

  if (listError) {
    return res.status(500).json({ error: listError.message });
  }

  return res.status(200).json({ users: data });
}
