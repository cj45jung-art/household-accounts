import React, { useState, useEffect, useMemo } from 'react';
import { addTransaction, updateTransaction } from '../services/transactionService';
import { supabase } from '../supabaseClient';
import type { Category, TransactionType, AssetType, Transaction } from '../types/household';

interface TransactionFormProps {
  categories: Category[];
  onSuccess: () => void;
  editingTransaction?: Transaction | null;
  onCancelEdit?: () => void;
  onDeleteTransaction?: (id: string) => Promise<void>;
}

function TransactionForm({ 
  categories, 
  onSuccess, 
  editingTransaction, 
  onCancelEdit, 
  onDeleteTransaction 
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [amount, setAmount] = useState<string>('');
  const [assetType, setAssetType] = useState<AssetType>('card');
  const [categoryId, setCategoryId] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. 선택한 유형(수입/지출)에 맞는 카테고리 필터링 최적화 (useMemo 적용)
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => cat.type === type);
  }, [categories, type]);

  // 유형이 바뀔 때 카테고리 선택 초기화 (수정 중이 아닐 때만)
  useEffect(() => {
    if (!editingTransaction) {
      setCategoryId('');
    }
  }, [type, editingTransaction]);

  // 수정 중인 거래 내역 감지하여 폼 내용 로드
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setTransactionDate(editingTransaction.transaction_date);
      setAmount(Number(editingTransaction.amount).toLocaleString('ko-KR'));
      setAssetType(editingTransaction.asset_type);
      setCategoryId(editingTransaction.category_id || '');
      setMemo(editingTransaction.memo || '');
    } else {
      // 추가 모드인 경우 폼 초기화
      setType('expense');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      setAssetType('card');
      setCategoryId('');
      setMemo('');
    }
    setError(null);
  }, [editingTransaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('올바른 금액을 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Supabase 세션에서 현재 로그인된 유저 ID 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      
      // 임시 테스트용: 로그인 정보가 없을 경우 미리 생성해 둔 테스트용 UUID를 사용합니다.
      const userId = user?.id || '3198e1f1-8aee-41a2-abbe-c7e881a82a97';

      const transactionData = {
        transaction_date: transactionDate,
        type,
        amount: numericAmount,
        asset_type: assetType,
        category_id: categoryId || null,
        memo: memo.trim() || null,
        user_id: userId,
      };

      if (editingTransaction) {
        // 기존 거래 내역 수정 API 호출
        await updateTransaction(editingTransaction.id, transactionData);
      } else {
        // 새로운 거래 내역 추가 API 호출
        await addTransaction(transactionData);
      }

      // 등록/수정 성공 시 폼 초기화 및 새로고침 콜백 실행
      setAmount('');
      setMemo('');
      setCategoryId('');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || '네트워크 장애가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 금액 입력 시 천 단위 콤마 포맷팅 헬퍼
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value === '') {
      setAmount('');
      return;
    }
    setAmount(Number(value).toLocaleString('ko-KR'));
  };

  return (
    <div className="max-w-md w-full mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800/80 overflow-hidden transition-all duration-300">
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          {editingTransaction ? '가계부 내역 수정' : '가계부 내역 추가'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {editingTransaction ? '선택한 가계부 내역의 상세 정보를 수정합니다.' : '새로운 수입 또는 지출 내역을 기록해 보세요.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 text-xs text-red-650 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/30">
            {error}
          </div>
        )}

        {/* 1. 수입/지출 선택 탭 */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
              type === 'expense'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-slate-650 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-100'
            }`}
          >
            지출 (Expense)
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
              type === 'income'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-655 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-100'
            }`}
          >
            수입 (Income)
          </button>
        </div>

        {/* 2. 날짜 및 금액 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5">
              날짜
            </label>
            <input
              type="date"
              required
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5">
              금액 (원)
            </label>
            <input
              type="text"
              required
              placeholder="0"
              value={amount}
              onChange={handleAmountChange}
              className="w-full text-sm text-right bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-400"
            />
          </div>
        </div>

        {/* 3. 자산 분류 & 세부 카테고리 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5">
              결제/입금 수단
            </label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as AssetType)}
              className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-400"
            >
              <option value="card">💳 카드</option>
              <option value="account">🏦 계좌</option>
              <option value="cash">💵 현금</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5">
              세부 카테고리
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-400"
            >
              <option value="">카테고리 선택</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4. 메모 */}
        <div>
          <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5">
            메모 (선택)
          </label>
          <input
            type="text"
            placeholder="메모를 입력하세요"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-400"
          />
        </div>

        {/* 5. 제출 및 기타 버튼 */}
        <div className="space-y-2 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 rounded-xl text-sm font-bold text-white shadow-md transition-all duration-200 ${
              type === 'expense'
                ? 'bg-red-500 hover:bg-red-600 active:scale-[0.98]'
                : 'bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98]'
            } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting 
              ? (editingTransaction ? '수정하는 중...' : '기록하는 중...') 
              : (editingTransaction ? '수정 완료' : '저장하기')}
          </button>

          {editingTransaction && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (onDeleteTransaction && window.confirm('정말 이 내역을 삭제하시겠습니까?')) {
                    setIsSubmitting(true);
                    try {
                      await onDeleteTransaction(editingTransaction.id);
                      onSuccess(); // 폼을 닫고 새로고침
                    } catch (err) {
                      alert('삭제에 실패했습니다.');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }
                }}
                disabled={isSubmitting}
                className="py-2.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 hover:bg-red-100/50 dark:hover:bg-red-950/30 transition-all duration-150"
              >
                삭제하기
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={isSubmitting}
                className="py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-350 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 transition-all duration-150"
              >
                수정 취소
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

// React.memo를 사용해 부모 컴포넌트 리렌더링 시 불필요한 연산 방지
export default React.memo(TransactionForm);
