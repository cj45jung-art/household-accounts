import { supabase } from '../supabaseClient';
import type { Transaction, Category, TransactionType, AssetType } from '../types/household';

/**
 * 1. 거래(Transactions) CRUD 관련 API
 */

interface GetTransactionsOptions {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  type?: TransactionType;
  assetType?: AssetType;
  categoryId?: string;
}

/**
 * 사용자의 거래 내역을 조회합니다. (카테고리 정보를 JOIN하여 반환)
 */
export async function getTransactions(options: GetTransactionsOptions = {}) {
  let query = supabase
    .from('transactions')
    .select(`
      *,
      category:categories(*)
    `)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  // 조건 필터링
  if (options.startDate) {
    query = query.gte('transaction_date', options.startDate);
  }
  if (options.endDate) {
    query = query.lte('transaction_date', options.endDate);
  }
  if (options.type) {
    query = query.eq('type', options.type);
  }
  if (options.assetType) {
    query = query.eq('asset_type', options.assetType);
  }
  if (options.categoryId) {
    query = query.eq('category_id', options.categoryId);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  // Supabase의 join 결과 타입을 캐스팅하여 반환
  return data as unknown as Transaction[];
}

/**
 * 새로운 거래 내역을 등록합니다.
 */
export async function addTransaction(
  transaction: Omit<Transaction, 'id' | 'created_at' | 'user_id'> & { user_id: string }
) {
  const { data, error } = await supabase
    .from('transactions')
    .insert([transaction])
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Transaction;
}

/**
 * 기존 거래 내역을 수정합니다.
 */
export async function updateTransaction(
  id: string,
  updates: Partial<Omit<Transaction, 'id' | 'created_at' | 'user_id' | 'category'>>
) {
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Transaction;
}

/**
 * 특정 거래 내역을 삭제합니다.
 */
export async function deleteTransaction(id: string) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}


/**
 * 2. 카테고리(Categories) 관련 API
 */

/**
 * 사용자가 사용할 수 있는 카테고리 목록(공통 카테고리 + 유저 정의 카테고리)을 조회합니다.
 */
export async function getCategories() {
  // RLS 정책("Allow read for public categories or owner") 덕분에 
  // user_id가 NULL(공용)이거나 본인 소유인 카테고리가 자동으로 필터링되어 반환됩니다.
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Category[];
}

/**
 * 사용자의 커스텀 카테고리를 추가합니다.
 */
export async function addCategory(
  category: Omit<Category, 'id' | 'created_at' | 'user_id'> & { user_id: string }
) {
  const { data, error } = await supabase
    .from('categories')
    .insert([category])
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}


/**
 * 3. 가계부 시각화 및 통계(Statistics) 데이터 처리 헬퍼
 */

export interface CategoryStat {
  categoryId: string | null;
  categoryName: string;
  amount: number;
  percentage: number;
}

export interface TransactionStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  expenseByCategory: CategoryStat[];
  incomeByCategory: CategoryStat[];
}

/**
 * 거래 데이터를 요약 및 가공하여 차트 시각화에 적합한 통계 정보를 생성합니다.
 */
export function calculateStats(transactions: Transaction[]): TransactionStats {
  let totalIncome = 0;
  let totalExpense = 0;
  
  const expenseMap = new Map<string | null, { name: string; amount: number }>();
  const incomeMap = new Map<string | null, { name: string; amount: number }>();

  transactions.forEach((tx) => {
    const amount = Number(tx.amount);
    const categoryId = tx.category_id;
    const categoryName = tx.category?.name || '미지정';

    if (tx.type === 'income') {
      totalIncome += amount;
      const current = incomeMap.get(categoryId) || { name: categoryName, amount: 0 };
      incomeMap.set(categoryId, { name: categoryName, amount: current.amount + amount });
    } else {
      totalExpense += amount;
      const current = expenseMap.get(categoryId) || { name: categoryName, amount: 0 };
      expenseMap.set(categoryId, { name: categoryName, amount: current.amount + amount });
    }
  });

  const getSortedStats = (map: Map<string | null, { name: string; amount: number }>, total: number): CategoryStat[] => {
    if (total === 0) return [];
    return Array.from(map.entries())
      .map(([id, info]) => ({
        categoryId: id,
        categoryName: info.name,
        amount: info.amount,
        percentage: Number(((info.amount / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    expenseByCategory: getSortedStats(expenseMap, totalExpense),
    incomeByCategory: getSortedStats(incomeMap, totalIncome),
  };
}
