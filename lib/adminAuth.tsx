import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  is_super_admin: boolean;
  allowed_pages: string[];
  is_active: boolean;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  loading: boolean;
  isSuperAdmin: boolean;
  canAccessPage: (pageKey: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  refetchAdmin: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  user: null,
  loading: true,
  isSuperAdmin: false,
  canAccessPage: () => false,
  login: async () => {},
  refetchAdmin: async () => {},
  signOut: async () => {},
});

export const useAdminAuth = () => useContext(AdminAuthContext);

// ─── Helpers ───

/** Get Supabase access token for API calls (used by users.tsx).
 *  Tries getSession first; if expired, forces a refresh. */
export async function getSupabaseAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    // Check if token expires within 60 seconds
    const expiresAt = data.session.expires_at; // unix seconds
    if (expiresAt && expiresAt - Date.now() / 1000 < 60) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      return refreshed.session?.access_token ?? data.session.access_token;
    }
    return data.session.access_token;
  }
  // No session — try refreshing in case there's a stored refresh token
  const { data: refreshed } = await supabase.auth.refreshSession();
  return refreshed.session?.access_token ?? null;
}

/** Fetch admin record from admin_users table */
async function fetchAdminRecord(userId: string): Promise<AdminUser | null> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data as AdminUser;
}

// ─── Provider ───

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // On mount: restore session from Supabase
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const admin = await fetchAdminRecord(session.user.id);
          if (mountedRef.current) setUser(admin);
        }
      } catch {
        // Network error — try again later
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    // Listen for auth state changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_OUT') {
          if (mountedRef.current) setUser(null);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'Invalid email or password');
    }

    // Verify they are an active admin
    const admin = await fetchAdminRecord(data.user.id);
    if (!admin) {
      await supabase.auth.signOut();
      throw new Error('You are not an admin');
    }

    if (mountedRef.current) setUser(admin);
  }, []);

  const refetchAdmin = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    try {
      const admin = await fetchAdminRecord(session.user.id);
      if (mountedRef.current) setUser(admin);
    } catch {
      // Network error
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    if (mountedRef.current) setUser(null);
  }, []);

  const isSuperAdmin = user?.is_super_admin ?? false;

  const canAccessPage = useCallback((pageKey: string): boolean => {
    if (!user || !user.is_active) return false;
    if (user.is_super_admin) return true;
    return user.allowed_pages.includes(pageKey);
  }, [user]);

  return (
    <AdminAuthContext.Provider value={{
      user, loading, isSuperAdmin, canAccessPage, login, refetchAdmin, signOut,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
