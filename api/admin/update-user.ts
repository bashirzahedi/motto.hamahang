import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, verifySuperAdmin } from './_helpers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const callerId = await verifySuperAdmin(req, res);
  if (!callerId) return;

  const { id, display_name, is_super_admin, allowed_pages, is_active } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof display_name === 'string') updates.display_name = display_name;
  if (typeof is_super_admin === 'boolean') updates.is_super_admin = is_super_admin;
  if (Array.isArray(allowed_pages)) updates.allowed_pages = allowed_pages;
  if (typeof is_active === 'boolean') updates.is_active = is_active;

  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}
