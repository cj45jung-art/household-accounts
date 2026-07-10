import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder-anon-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase URL 또는 Anon Key가 설정되지 않았습니다. .env 파일을 확인해 주세요. (현재 플레이스홀더로 초기화됨)'
  );
}

// Supabase 클라이언트 초기화 및 내보내기
export const supabase = createClient(supabaseUrl, supabaseAnonKey);


