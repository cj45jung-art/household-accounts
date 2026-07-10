import React, { useEffect, useState, useCallback, useMemo } from 'react';
import './index.css';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import Dashboard from './components/Dashboard';
import { getTransactions, getCategories, deleteTransaction, calculateStats } from './services/transactionService';
import type { Transaction, Category } from './types/household';

// 1. 정산 기준 및 월에 맞춰 시작일/종료일 구하기 헬퍼 함수
const getPeriodDates = (rule: string, monthStr: string, customStart: string, customEnd: string) => {
  if (rule === 'custom') {
    return { startDate: customStart, endDate: customEnd };
  }
  
  const [year, month] = monthStr.split('-').map(Number);
  if (rule === '25-to-24') {
    // 이전달 25일 ~ 이번달 24일
    const prevDate = new Date(year, month - 2, 25);
    const currDate = new Date(year, month - 1, 24);
    
    const formatDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    
    return {
      startDate: formatDateStr(prevDate),
      endDate: formatDateStr(currDate)
    };
  } else {
    // 1일 ~ 말일
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { startDate: start, endDate: end };
  }
};

// 2. 가계부 정산 마크다운 보고서 생성 헬퍼 함수
const generateMarkdownReport = (txList: Transaction[], periodStart: string, periodEnd: string, rule: string) => {
  const stats = calculateStats(txList);
  const ruleLabel = rule === 'first-to-last' ? '1일 ~ 말일' : rule === '25-to-24' ? '25일 ~ 익월 24일' : '사용자 지정';
  
  let markdown = `# 📊 가계부 정산 보고서\n\n`;
  markdown += `## 📅 정산 정보\n`;
  markdown += `- **정산 기준**: ${ruleLabel}\n`;
  markdown += `- **정산 기간**: \`${periodStart}\` ~ \`${periodEnd}\`\n\n`;
  
  markdown += `## 💰 자금 현황 요약\n`;
  markdown += `- **총 수입**: \`+${stats.totalIncome.toLocaleString('ko-KR')}\` 원\n`;
  markdown += `- **총 지출**: \`-${stats.totalExpense.toLocaleString('ko-KR')}\` 원\n`;
  markdown += `- **순 잔액**: \`${(stats.totalIncome - stats.totalExpense >= 0 ? '+' : '')}${(stats.totalIncome - stats.totalExpense).toLocaleString('ko-KR')}\` 원\n\n`;
  
  markdown += `## 🗂️ 카테고리별 세부 현황\n\n`;
  
  markdown += `### 📈 수입 카테고리\n`;
  if (stats.incomeByCategory.length > 0) {
    markdown += `| 카테고리 | 금액 | 비율 |\n`;
    markdown += `| :--- | :--- | :--- |\n`;
    stats.incomeByCategory.forEach(c => {
      markdown += `| ${c.categoryName} | ${c.amount.toLocaleString('ko-KR')} 원 | ${c.percentage}% |\n`;
    });
  } else {
    markdown += `*기록된 수입 내역이 없습니다.*\n`;
  }
  markdown += `\n`;
  
  markdown += `### 📉 지출 카테고리\n`;
  if (stats.expenseByCategory.length > 0) {
    markdown += `| 카테고리 | 금액 | 비율 |\n`;
    markdown += `| :--- | :--- | :--- |\n`;
    stats.expenseByCategory.forEach(c => {
      markdown += `| ${c.categoryName} | ${c.amount.toLocaleString('ko-KR')} 원 | ${c.percentage}% |\n`;
    });
  } else {
    markdown += `*기록된 지출 내역이 없습니다.*\n`;
  }
  markdown += `\n`;
  
  markdown += `## 📝 상세 거래 내역\n`;
  if (txList.length > 0) {
    markdown += `| 날짜 | 구분 | 결제수단 | 카테고리 | 메모 | 금액 |\n`;
    markdown += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    const sortedTx = [...txList].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
    sortedTx.forEach(tx => {
      const typeLabel = tx.type === 'income' ? '수입' : '지출';
      const assetLabel = tx.asset_type === 'card' ? '카드' : tx.asset_type === 'account' ? '계좌' : '현금';
      const amountSign = tx.type === 'income' ? '+' : '-';
      markdown += `| ${tx.transaction_date} | ${typeLabel} | ${assetLabel} | ${tx.category?.name || '미지정'} | ${tx.memo || '-'} | ${amountSign}${tx.amount.toLocaleString('ko-KR')} 원 |\n`;
    });
  } else {
    markdown += `*해당 기간에 기록된 거래 내역이 없습니다.*\n`;
  }
  
  return markdown;
};

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- 정산 필터 및 리포트 관련 상태 ---
  const [settlementRule, setSettlementRule] = useState<'first-to-last' | '25-to-24' | 'custom'>('first-to-last');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [customStartDate, setCustomStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);
  const [copied, setCopied] = useState(false);

  // --- 거래 수정 관련 상태 ---
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // 1. Supabase 데이터 로딩 함수
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedTransactions, fetchedCategories] = await Promise.all([
        getTransactions(),
        getCategories(),
      ]);
      setTransactions(fetchedTransactions);
      setCategories(fetchedCategories);
    } catch (err: any) {
      console.error('데이터 로딩 오류:', err);
      setError(
        err.message || '가계부 데이터를 불러오는 중 오류가 발생했습니다. 네트워크 상태 및 Supabase 설정을 확인해 주세요.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 데이터 내 존재하는 유니크한 월 목록 추출 (정산 월 선택 드롭다운용)
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(tx => {
      if (tx.transaction_date) {
        months.add(tx.transaction_date.slice(0, 7));
      }
    });
    // 현재 월은 항상 기본값으로 포함
    months.add(new Date().toISOString().slice(0, 7));
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // 활성화된 정산 상세 날짜 구하기
  const activePeriod = useMemo(() => {
    return getPeriodDates(settlementRule, selectedMonth, customStartDate, customEndDate);
  }, [settlementRule, selectedMonth, customStartDate, customEndDate]);

  // 정산 범위 내 거래 필터링
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      return tx.transaction_date >= activePeriod.startDate && tx.transaction_date <= activePeriod.endDate;
    });
  }, [transactions, activePeriod]);

  // 가계부 정산 마크다운 보고서 생성
  const generatedReport = useMemo(() => {
    return generateMarkdownReport(filteredTransactions, activePeriod.startDate, activePeriod.endDate, settlementRule);
  }, [filteredTransactions, activePeriod, settlementRule]);

  // 마크다운 복사 기능
  const handleCopyReport = () => {
    navigator.clipboard.writeText(generatedReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 2. 가계부 추가/수정 성공 시 리사이클 새로고침 콜백
  const handleFormSuccess = useCallback(() => {
    loadData();
    setEditingTransaction(null);
  }, [loadData]);

  const handleCancelEdit = useCallback(() => {
    setEditingTransaction(null);
  }, []);

  // 3. 특정 가계부 거래 내역 삭제 콜백
  const handleTransactionDelete = useCallback(async (id: string) => {
    try {
      setError(null);
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((tx) => tx.id !== id));
      if (editingTransaction?.id === id) {
        setEditingTransaction(null);
      }
    } catch (err: any) {
      console.error('내역 삭제 오류:', err);
      setError(err.message || '내역을 삭제하는 과정에서 네트워크 오류가 발생했습니다.');
      throw err;
    }
  }, [editingTransaction]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* 헤더 섹션 */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-950 dark:text-slate-50 tracking-tight">
              📊 시각화 가계부
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Supabase 실시간 데이터베이스 연동 및 거래 관리 대시보드
            </p>
          </div>
          <button 
            onClick={loadData}
            disabled={loading}
            className={`mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 active:scale-[0.98] shadow-sm transition-all duration-200 ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                로딩 중...
              </>
            ) : (
              <>🔄 새로고침</>
            )}
          </button>
        </header>

        {/* 에러 피드백 알림 영역 */}
        {error && (
          <div className="p-4 text-sm text-red-750 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-2xl border border-red-200 dark:border-red-900/40 flex items-start gap-3 shadow-sm animate-fade-in">
            <span className="text-lg">⚠️</span>
            <div>
              <h4 className="font-bold">알림 및 오류 안내</h4>
              <p className="mt-0.5 text-xs opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* 1. 대시보드 시각화 영역 */}
        <section className={loading ? 'opacity-65 pointer-events-none transition-opacity duration-200' : 'transition-opacity duration-200'}>
          <Dashboard transactions={filteredTransactions} />
        </section>

        {/* 2. 월별 정산 및 결산 보고서 생성 영역 */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 정산 기간 설정 */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800/80 p-6 space-y-4 transition-all duration-300">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                📅 월별 정산 기준 설정
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">가계부 정산 기준과 기간을 설정합니다.</p>
            </div>
            
            {/* 정산 기준 라디오 버튼 그룹 */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450">정산 기준</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSettlementRule('first-to-last')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    settlementRule === 'first-to-last'
                      ? 'bg-slate-850 dark:bg-slate-100 text-white dark:text-slate-950 shadow-sm'
                      : 'text-slate-650 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-100'
                  }`}
                >
                  1일 ~ 말일
                </button>
                <button
                  type="button"
                  onClick={() => setSettlementRule('25-to-24')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    settlementRule === '25-to-24'
                      ? 'bg-slate-850 dark:bg-slate-100 text-white dark:text-slate-950 shadow-sm'
                      : 'text-slate-650 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-100'
                  }`}
                >
                  25일 ~ 24일
                </button>
                <button
                  type="button"
                  onClick={() => setSettlementRule('custom')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    settlementRule === 'custom'
                      ? 'bg-slate-850 dark:bg-slate-100 text-white dark:text-slate-950 shadow-sm'
                      : 'text-slate-650 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-100'
                  }`}
                >
                  사용자 지정
                </button>
              </div>
            </div>

            {/* 정산 기준에 따른 추가 옵션 */}
            {settlementRule !== 'custom' ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450">정산 월 선택</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/30"
                >
                  {uniqueMonths.map(m => {
                    const [year, month] = m.split('-');
                    return (
                      <option key={m} value={m}>
                        {year}년 {month}월 {settlementRule === '25-to-24' ? '(전월 25일~금월 24일)' : '(1일~말일)'}
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 mb-1">시작일</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 mb-1">종료일</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/30"
                  />
                </div>
              </div>
            )}

            {/* 실제 적용된 정산 기간 텍스트 */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl p-3 text-xs text-slate-650 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">정산 계산 범위: </span>
              <code className="ml-1 bg-slate-200 dark:bg-slate-850 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-150 font-mono">
                {activePeriod.startDate} ~ {activePeriod.endDate}
              </code>
            </div>
          </div>

          {/* 마크다운 결산 보고서 */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800/80 p-6 space-y-4 transition-all duration-300">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                  📝 가계부 결산 보고서 (Markdown)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  선택한 정산 기간의 보고서입니다. 복사하여 노트나 회고록 등에 붙여넣기 하실 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyReport}
                className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl active:scale-[0.97] transition-all duration-200 shadow-sm ${
                  copied 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900'
                    : 'bg-emerald-550 hover:bg-emerald-600 text-white'
                }`}
              >
                {copied ? '✓ 복사 완료!' : '📋 마크다운 복사'}
              </button>
            </div>
            
            {/* 마크다운 소스 뷰어 */}
            <div className="relative">
              <pre className="w-full h-36 overflow-y-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-650 dark:text-slate-400 whitespace-pre-wrap">
                {generatedReport}
              </pre>
            </div>
          </div>
        </section>

        {/* 3. 하단 CRUD 및 리스트 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 입력 및 수정 폼 */}
          <section className="lg:col-span-5 w-full">
            <TransactionForm 
              categories={categories} 
              onSuccess={handleFormSuccess} 
              editingTransaction={editingTransaction}
              onCancelEdit={handleCancelEdit}
              onDeleteTransaction={handleTransactionDelete}
            />
          </section>

          {/* 내역 리스트 */}
          <section className="lg:col-span-7 w-full">
            <TransactionList
              transactions={filteredTransactions}
              onDelete={handleTransactionDelete}
              onSelectTransaction={setEditingTransaction}
              selectedTransactionId={editingTransaction?.id}
              loading={loading}
            />
          </section>
        </div>

      </div>
    </div>
  );
}

