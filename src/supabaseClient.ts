import { createClient } from '@supabase/supabase-js';
import { Database } from './types/household';

// React 개발 환경(Vite, CRA 등)에 맞춰 환경 변수를 안전하게 불러옵니다.
const getEnvVar = (viteKey: string, craKey: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.[viteKey]) {
    return import.meta.env[viteKey] as string;
  }
  if (typeof process !== 'undefined' && process.env?.[craKey]) {
    return process.env[craKey] as string;
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'REACT_APP_SUPABASE_URL') || 'https://placeholder.supabase.co';
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'REACT_APP_SUPABASE_ANON_KEY') || 'placeholder-anon-key';

if (!getEnvVar('VITE_SUPABASE_URL', 'REACT_APP_SUPABASE_URL') || !getEnvVar('VITE_SUPABASE_ANON_KEY', 'REACT_APP_SUPABASE_ANON_KEY')) {
  console.warn(
    'Supabase URL 또는 Anon Key가 설정되지 않았습니다. .env 파일을 확인해 주세요. (현재 플레이스홀더로 초기화됨)'
  );
}

// Supabase 클라이언트 초기화 및 내보내기
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
