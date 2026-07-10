import React, { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { Transaction } from '../types/household';

interface DashboardProps {
  transactions: Transaction[];
}

// 자산별 차트 색상 매핑
const ASSET_COLORS = {
  card: '#3b82f6',    // Blue
  account: '#a855f7', // Purple
  cash: '#f59e0b',    // Amber
};

const ASSET_NAMES = {
  card: '💳 카드',
  account: '🏦 계좌',
  cash: '💵 현금',
};

function Dashboard({ transactions }: DashboardProps) {
  // SSR/HMR 대응을 위해 마운트 상태 추적 (Recharts의 ResponsiveContainer 에러 방지)
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. 상단 요약 카드 데이터 연산
  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((tx) => {
      const amount = Number(tx.amount);
      if (tx.type === 'income') {
        totalIncome += amount;
      } else {
        totalExpense += amount;
      }
    });

    return {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
    };
  }, [transactions]);

  // 2. 자산별 수입/지출 합계 연산 (현금, 계좌, 카드)
  const assetData = useMemo(() => {
    const data = {
      income: { cash: 0, account: 0, card: 0 },
      expense: { cash: 0, account: 0, card: 0 },
    };

    transactions.forEach((tx) => {
      const amount = Number(tx.amount);
      const asset = tx.asset_type;
      if (tx.type === 'income') {
        data.income[asset] += amount;
      } else {
        data.expense[asset] += amount;
      }
    });

    // Recharts Pie Chart 포맷으로 변환
    const incomePie = [
      { name: ASSET_NAMES.card, value: data.income.card, color: ASSET_COLORS.card },
      { name: ASSET_NAMES.account, value: data.income.account, color: ASSET_COLORS.account },
      { name: ASSET_NAMES.cash, value: data.income.cash, color: ASSET_COLORS.cash },
    ].filter((item) => item.value > 0);

    const expensePie = [
      { name: ASSET_NAMES.card, value: data.expense.card, color: ASSET_COLORS.card },
      { name: ASSET_NAMES.account, value: data.expense.account, color: ASSET_COLORS.account },
      { name: ASSET_NAMES.cash, value: data.expense.cash, color: ASSET_COLORS.cash },
    ].filter((item) => item.value > 0);

    return { incomePie, expensePie };
  }, [transactions]);

  // 3. 전체 비교 대조 차트 데이터 포맷팅
  const compareData = useMemo(() => {
    return [
      {
        name: '수입 vs 지출',
        수입: summary.income,
        지출: summary.expense,
      },
    ];
  }, [summary]);

  return (
    <div className="space-y-6">
      {/* 1. 상단 요약 카드 (Summary Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 총 수입 카드 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">총 수입</span>
            <h3 className="text-2xl font-bold text-emerald-500 mt-1">
              +{summary.income.toLocaleString()}원
            </h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl flex items-center justify-center text-emerald-500 text-xl font-bold">
            📈
          </div>
        </div>

        {/* - 총 지출 카드 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">총 지출</span>
            <h3 className="text-2xl font-bold text-red-500 mt-1">
              -{summary.expense.toLocaleString()}원
            </h3>
          </div>
          <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-xl flex items-center justify-center text-red-500 text-xl font-bold">
            📉
          </div>
        </div>

        {/* 잔액 카드 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">잔액</span>
            <h3 className={`text-2xl font-bold mt-1 ${summary.balance >= 0 ? 'text-blue-500' : 'text-red-650'}`}>
              {summary.balance.toLocaleString()}원
            </h3>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${
            summary.balance >= 0 ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-500' : 'bg-red-50 dark:bg-red-950/30 text-red-650'
          }`}>
            💰
          </div>
        </div>
      </div>

      {/* 2. 대조 차트 및 자산별 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 전체 비교: 총 수입과 총 지출 규모 대조 바 차트 */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">총량 비교</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">수입과 지출의 총규모를 비교합니다.</p>
          </div>
          <div className="h-60 mt-4 flex items-center justify-center">
            {!isMounted ? (
              <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin"></div>
            ) : summary.income === 0 && summary.expense === 0 ? (
              <p className="text-xs text-slate-400">비교할 데이터가 없습니다.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip formatter={(value) => `${Number(value).toLocaleString()}원`} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="수입" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="지출" fill="#ef4444" radius={[8, 8, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 자산별 시각화: 수입/지출 파이 차트 */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800/80">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">자산 수단별 비율</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">결제 및 입금 수단별 점유율을 시각화합니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 수입 자산 비율 파이 차트 */}
            <div className="flex flex-col items-center justify-center">
              <h5 className="text-xs font-semibold text-emerald-500 mb-2">📥 수입 자산 구성</h5>
              <div className="h-48 w-full flex items-center justify-center">
                {!isMounted ? (
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin"></div>
                ) : assetData.incomePie.length === 0 ? (
                  <p className="text-xs text-slate-400">등록된 수입 데이터가 없습니다.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetData.incomePie}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {assetData.incomePie.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${Number(value).toLocaleString()}원`} />
                      <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 지출 자산 비율 파이 차트 */}
            <div className="flex flex-col items-center justify-center">
              <h5 className="text-xs font-semibold text-red-500 mb-2">💸 지출 자산 구성</h5>
              <div className="h-48 w-full flex items-center justify-center">
                {!isMounted ? (
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin"></div>
                ) : assetData.expensePie.length === 0 ? (
                  <p className="text-xs text-slate-400">등록된 지출 데이터가 없습니다.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetData.expensePie}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {assetData.expensePie.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${Number(value).toLocaleString()}원`} />
                      <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// React.memo로 불필요한 차트 연산 및 컴포넌트 리렌더링 최적화
export default React.memo(Dashboard);
