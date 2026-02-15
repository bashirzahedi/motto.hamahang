import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, verifySuperAdmin } from './_helpers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const callerId = await verifySuperAdmin(req, res);
  if (!callerId) return;

  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  // Prevent self-deletion
  if (user_id === callerId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  // Delete from admin_users first (CASCADE will handle auth.users FK)
  const { error: deleteRowError } = await supabaseAdmin
    .from('admin_users')
    .delete()
    .eq('user_id', user_id);

  if (deleteRowError) {
    return res.status(500).json({ error: deleteRowError.message });
  }

  // Delete from auth.users
  const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
  if (deleteAuthError) {
    return res.status(500).json({ error: deleteAuthError.message });
  }

  return res.status(200).json({ success: true });
}
