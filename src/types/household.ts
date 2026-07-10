/**
 * 거래 유형 타입
 */
export type TransactionType = 'income' | 'expense';

/**
 * 결제 및 입금 수단 (자산 분류) 타입
 */
export type AssetType = 'cash' | 'account' | 'card';

/**
 * 카테고리 인터페이스
 */
export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  created_at: string;
  user_id: string | null; // NULL 이면 공용(기본) 카테고리
}

/**
 * 거래 내역 인터페이스
 */
export interface Transaction {
  id: string;
  created_at: string;
  transaction_date: string; // YYYY-MM-DD 형식
  type: TransactionType;
  amount: number;
  asset_type: AssetType;
  category_id: string | null;
  memo: string | null;
  user_id: string;
  
  // 카테고리 정보가 Join되었을 때의 확장 타입
  category?: Category | null;
}

/**
 * Supabase가 자동 생성하는 Database 타입 정의 구조
 */
export interface Database {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Category>;
      };
      transactions: {
        Row: Omit<Transaction, 'category'>;
        Insert: Omit<Transaction, 'id' | 'created_at' | 'category'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Transaction, 'category'>>;
      };
    };
  };
}
