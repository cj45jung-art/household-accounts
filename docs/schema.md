# 시각화 가계부 데이터베이스 스키마 및 명세서

이 문서는 React와 Supabase를 사용하여 개발할 '시각화 가계부' 프로젝트의 데이터베이스 구조와 React에서 사용할 TypeScript 타입 정의를 명세합니다.

---

## 1. 데이터베이스 스키마 (Supabase SQL DDL)

Supabase(PostgreSQL) 콘솔의 SQL Editor에서 실행할 수 있는 DDL 스크립트입니다. 
확장성과 보안(RLS)을 고려하여 설계되었습니다.

```sql
-- =========================================================================
-- 1. 사용자 정의 ENUM 타입 생성
-- =========================================================================

-- 거래 유형: 수입(income), 지출(expense)
CREATE TYPE transaction_type AS ENUM ('income', 'expense');

-- 결제/입금 수단 (자산 분류): 현금(cash), 계좌(account), 카드(card)
CREATE TYPE asset_type AS ENUM ('cash', 'account', 'card');


-- =========================================================================
-- 2. 테이블 생성
-- =========================================================================

-- 카테고리 테이블 (categories)
-- 사용자가 직접 카테고리를 확장할 수 있으며, user_id가 NULL인 경우 시스템 기본 카테고리로 간주합니다.
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    type transaction_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 거래 내역 테이블 (transactions)
CREATE TABLE transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    transaction_date DATE NOT NULL,
    type transaction_type NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    asset_type asset_type NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    memo TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);


-- =========================================================================
-- 3. 행 수준 보안 (RLS, Row Level Security) 및 정책(Policies) 설정
-- =========================================================================

-- RLS 활성화
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- categories 테이블 정책:
-- 1. 누구나 조회 가능 (기본 시스템 제공 카테고리는 user_id IS NULL 이며, 본인의 카테고리도 조회 가능)
CREATE POLICY "Allow read for public categories or owner" ON categories
    FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

-- 2. 본인의 카테고리만 추가 가능
CREATE POLICY "Allow insert for owners" ON categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. 본인의 카테고리만 수정 가능
CREATE POLICY "Allow update for owners" ON categories
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. 본인의 카테고리만 삭제 가능
CREATE POLICY "Allow delete for owners" ON categories
    FOR DELETE USING (auth.uid() = user_id);


-- transactions 테이블 정책:
-- 1. 본인의 거래 내역만 조회 가능
CREATE POLICY "Allow select for owners" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

-- 2. 본인의 거래 내역만 추가 가능
CREATE POLICY "Allow insert for owners" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. 본인의 거래 내역만 수정 가능
CREATE POLICY "Allow update for owners" ON transactions
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. 본인의 거래 내역만 삭제 가능
CREATE POLICY "Allow delete for owners" ON transactions
    FOR DELETE USING (auth.uid() = user_id);


-- =========================================================================
-- 4. 초기 기본 카테고리 데이터 삽입 (선택 사항)
-- =========================================================================
-- user_id가 NULL인 공통 카테고리 데이터입니다. 모든 사용자가 기본적으로 조회할 수 있습니다.
INSERT INTO categories (name, type, user_id) VALUES
    -- 수입 카테고리
    ('급여', 'income', NULL),
    ('용돈', 'income', NULL),
    ('부업', 'income', NULL),
    ('기타 수입', 'income', NULL),
    -- 지출 카테고리
    ('식비', 'expense', NULL),
    ('쇼핑', 'expense', NULL),
    ('교통', 'expense', NULL),
    ('주거/통신', 'expense', NULL),
    ('의료/건강', 'expense', NULL),
    ('문화/여가', 'expense', NULL),
    ('기타 지출', 'expense', NULL);
```

---

## 2. React TypeScript 인터페이스 (타입 정의)

React 애플리케이션에서 Supabase 클라이언트 SDK와 함께 활용할 TypeScript 타입 정의 파일 예시입니다. 
`src/types/household.ts` 와 같은 경로에 생성하여 사용할 수 있습니다.

```typescript
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
  amount: number; // 프론트엔드 연산 편의성을 위해 number 타입 지정
  asset_type: AssetType;
  category_id: string | null;
  memo: string | null;
  user_id: string;
  
  // 카테고리 정보가 Join되었을 때의 확장 타입 (Optional)
  category?: Category | null;
}

/**
 * Supabase가 자동 생성하는 Database 타입 정의 구조 (supabase-js 매핑용)
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
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at' | 'category'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Transaction, 'category'>>;
      };
    };
  };
}
```

---

## 3. 구조 특징 설명

1. **자유로운 카테고리 확장 구조**
   - `categories` 테이블을 별도로 정의하고 `user_id` 컬럼을 가집니다.
   - `user_id`가 `NULL`인 카테고리는 **모든 사용자가 공통으로 사용하는 기본 카테고리**가 되며, 사용자가 직접 추가한 카테고리는 본인의 `user_id`가 할당되어 **해당 사용자만 조회/사용**할 수 있습니다.

2. **Row Level Security (RLS) 적용**
   - Supabase의 강력한 보안 기능인 RLS를 적용하여 다른 사용자가 내 자산 내역이나 개인 커스텀 카테고리를 훔쳐보거나 위변조하지 못하도록 데이터베이스 단에서 보안 처리를 하였습니다.

3. **외래키(FK) 무결성 및 유연성**
   - `transactions`의 `category_id`는 `categories.id`를 참조하며, 카테고리가 삭제되는 경우 관련 거래 내역이 삭제되지 않고 카테고리 미지정 상태(`NULL`)로 남도록 `ON DELETE SET NULL` 옵션을 지정했습니다.
