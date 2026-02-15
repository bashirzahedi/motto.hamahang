import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

/**
 * Verify the request is from an authenticated super admin.
 * Uses the Supabase access token from the Authorization header.
 * Returns the caller's user_id on success, or sends an error and returns null.
 */
export async function verifySuperAdmin(
  req: VercelRequest,
  res: VercelResponse,
): Promise<string | null> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return null;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing auth token' });
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify the Supabase access token
  const { data: { user: authUser }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !authUser) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }

  // Check admin_users table for super admin status
  const { data: admin } = await supabaseAdmin
    .from('admin_users')
    .select('is_super_admin')
    .eq('user_id', authUser.id)
    .eq('is_active', true)
    .single();

  if (!admin) {
    res.status(403).json({ error: 'Not an admin' });
    return null;
  }

  if (!admin.is_super_admin) {
    res.status(403).json({ error: 'Only super admins can perform this action' });
    return null;
  }

  return authUser.id;
}
