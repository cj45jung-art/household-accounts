import React, { useState } from 'react';
import type { Transaction, AssetType } from '../types/household';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => Promise<void>;
  onSelectTransaction: (transaction: Transaction) => void;
  selectedTransactionId?: string;
  loading: boolean;
}

// 1. 자산 타입에 따른 뱃지 렌더링 헬퍼 (글로벌 스코프로 이동하여 컴포넌트 리렌더링 시 재생성 방지)
const getAssetBadge = (asset: AssetType) => {
  switch (asset) {
    case 'card':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40">
          💳 카드
        </span>
      );
    case 'account':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border border-purple-100 dark:border-purple-800/40">
          🏦 계좌
        </span>
      );
    case 'cash':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-100 dark:border-amber-800/40">
          💵 현금
        </span>
      );
  }
};

// 2. 날짜 포맷 헬퍼 (글로벌 스코프로 이동)
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
};

function TransactionList({
  transactions,
  onDelete,
  onSelectTransaction,
  selectedTransactionId,
  loading,
}: TransactionListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteClick = async (id: string) => {
    if (!window.confirm('이 내역을 정말 삭제하시겠습니까?')) return;
    
    setDeletingId(id);
    try {
      await onDelete(id);
    } catch (err) {
      alert('네트워크 상태가 불안정하여 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-500 rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500">내역을 가져오는 중입니다...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 shadow-sm">
        <span className="text-4xl">📝</span>
        <h4 className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
          기록된 내역이 없습니다
        </h4>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          새로운 가계부 입력을 추가해 자산 현황을 관리해 보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800/80 overflow-hidden transition-all duration-300">
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            가계부 내역
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            최근 등록된 거래 순서대로 표시됩니다. 내역을 클릭하면 수정할 수 있습니다.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
          총 {transactions.length}건
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <th className="py-3 px-6">날짜</th>
              <th className="py-3 px-6">분류</th>
              <th className="py-3 px-6">카테고리</th>
              <th className="py-3 px-6">메모</th>
              <th className="py-3 px-6 text-right">금액</th>
              <th className="py-3 px-6 text-center">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
            {transactions.map((tx) => {
              const isExpense = tx.type === 'expense';
              const isDeleting = deletingId === tx.id;
              const isSelected = selectedTransactionId === tx.id;

              return (
                <tr 
                  key={tx.id} 
                  onClick={() => !isDeleting && onSelectTransaction(tx)}
                  className={`cursor-pointer transition-all duration-150 hover:bg-slate-50 dark:hover:bg-slate-850 ${
                    isSelected 
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 font-semibold ring-1 ring-blue-200 dark:ring-blue-900/60' 
                      : ''
                  } ${
                    isDeleting ? 'opacity-50 bg-slate-50 dark:bg-slate-800/40 pointer-events-none' : ''
                  }`}
                >
                  {/* 날짜 */}
                  <td className="py-4 px-6 text-sm whitespace-nowrap">
                    {formatDate(tx.transaction_date)}
                  </td>
                  
                  {/* 분류 (자산) */}
                  <td className="py-4 px-6 whitespace-nowrap">
                    {getAssetBadge(tx.asset_type)}
                  </td>
                  
                  {/* 카테고리 */}
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span className="text-sm font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-xs">
                      {tx.category?.name || '기타'}
                    </span>
                  </td>
                  
                  {/* 메모 */}
                  <td className="py-4 px-6 text-sm max-w-xs truncate">
                    {tx.memo || <span className="text-slate-300 dark:text-slate-750">-</span>}
                  </td>
                  
                  {/* 금액 */}
                  <td className={`py-4 px-6 text-sm font-bold text-right whitespace-nowrap ${
                    isExpense ? 'text-red-500' : 'text-emerald-500'
                  }`}>
                    {isExpense ? '-' : '+'} {Number(tx.amount).toLocaleString('ko-KR')}원
                  </td>
                  
                  {/* 액션 (삭제) */}
                  <td className="py-4 px-6 text-center whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(tx.id);
                      }}
                      disabled={isDeleting}
                      className="text-slate-400 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-200"
                      title="삭제"
                    >
                      {isDeleting ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// React.memo로 불필요한 목록 리렌더링 차단 최적화
export default React.memo(TransactionList);
