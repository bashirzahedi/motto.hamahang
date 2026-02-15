import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, verifySuperAdmin } from './_helpers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const callerId = await verifySuperAdmin(req, res);
  if (!callerId) return;

  const { email, password, display_name, is_super_admin, allowed_pages } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Create auth user
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    return res.status(400).json({ error: createError.message });
  }

  // Insert admin_users row
  const { error: insertError } = await supabaseAdmin.from('admin_users').insert({
    user_id: newUser.user.id,
    email,
    display_name: display_name || '',
    is_super_admin: is_super_admin || false,
    allowed_pages: allowed_pages || [],
  });

  if (insertError) {
    // Rollback: delete the auth user if admin_users insert fails
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
    return res.status(500).json({ error: insertError.message });
  }

  return res.status(200).json({
    id: newUser.user.id,
    email: newUser.user.email,
  });
}
