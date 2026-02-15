import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types
export interface Slang {
  id: string;
  text: string;
  repeat_count: number;
  seconds_per: number;
  order_index: number;
  is_active: boolean;
  admin_override: boolean;
  vote_score: number;
  created_at: string;
  updated_at: string;
}

export interface SloganVote {
  id: string;
  slang_id: string;
  voter_id: string;
  vote: number;
  created_at: string;
}

export interface Suggestion {
  id: string;
  text: string;
  repeat_count: number;
  seconds_per: number;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
  ip_hash: string | null;
  notes: string | null;
}

export interface Settings {
  key: string;
  value: unknown;
  updated_at: string;
}

export interface Notice {
  id: string;
  text: string;
  text_en: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface AboutPage {
  id: string;
  content: string;
  content_en: string;
  updated_at: string;
}

export interface CrowdPeak {
  id: string;
  city: string;
  date: string;
  peak_count: number;
  reporter_count: number;
  updated_at: string;
  created_at: string;
}

export interface ExternalLink {
  id: string;
  title: string;
  title_en: string;
  subtitle: string;
  subtitle_en: string;
  url: string;
  icon: string;
  is_visible: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  is_super_admin: boolean;
  allowed_pages: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


