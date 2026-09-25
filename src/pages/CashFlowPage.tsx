import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { useFinancial } from '../context/FinancialContext';
import { KPICard } from '../components/common/KPICard';
import { ChartCard } from '../components/common/ChartCard';
import { formatINR, formatINRCompact, formatDate, formatPercent } from '../utils/formatters';
import { INITIAL_RECEIVABLES_AGING, INITIAL_PAYABLES_AGING } from '../data/mockData';
import { Sparkles, TrendingUp } from 'lucide-react';

export const CashFlowPage: React.FC = () => {
  const {
    forecastData,
    availableCash,
    duplicateHoldExecuted,
    actualTheme
  } = useFinancial();

  // Horizon & Scenario Controls
  const [horizonDays, setHorizonDays] = useState<30 | 60 | 90>(60);
  const [scenarioMode, setScenarioMode] = useState<'base' | 'optimistic' | 'conservative'>('base');

  // Filter forecast points according to selected horizon
  const displayedPoints = useMemo(() => {
    const histPoints = forecastData.filter(p => p.isHistorical);
    const futurePoints = forecastData.filter(p => !p.isHistorical).slice(0, horizonDays);
    const combined = [...histPoints, ...futurePoints];

    return combined.map(p => {
      let chosenForecast = p.forecastBalanceBase;
      if (scenarioMode === 'optimistic') chosenForecast = p.forecastBalanceOptimistic;
      if (scenarioMode === 'conservative') chosenForecast = p.forecastBalanceConservative;

      return {
        date: p.date.slice(5),
        fullDate: p.date,
        actual: p.isHistorical ? p.actualBalance : null,
        forecast: !p.isHistorical ? chosenForecast : null,
        upperBand: !p.isHistorical ? p.uncertaintyUpper : null,
        lowerBand: !p.isHistorical ? p.uncertaintyLower : null,
        inflow: p.inflows,
        outflow: p.outflows,
        net: p.netCashFlow,
        isHistorical: p.isHistorical
      };
    });
  }, [forecastData, horizonDays, scenarioMode]);

  // Find lowest cash balance and shortfall in chosen horizon
  const stats = useMemo(() => {
    const futureOnly = displayedPoints.filter(p => !p.isHistorical && p.forecast !== null);
    let lowest = availableCash;
    let lowestDate = 'N/A';
    let shortfallDate: string | null = null;

    futureOnly.forEach(p => {
      const val = p.forecast || 0;
      if (val < lowest) {
        lowest = val;
        lowestDate = p.fullDate;
      }
      if (val < 2500000 && !shortfallDate) {
        shortfallDate = p.fullDate;
      }
    });

    const endingCash = futureOnly.length > 0 ? (futureOnly[futureOnly.length - 1].forecast || 0) : availableCash;

    return {
      lowest,
      lowestDate,
      shortfallDate,
      endingCash
    };
  }, [displayedPoints, availableCash]);

  const gridColor = actualTheme === 'dark' ? '#222624' : '#E2E8F0';
  const actualLineColor = actualTheme === 'dark' ? '#10B981' : '#059669';
  const forecastLineColor = actualTheme === 'dark' ? '#F5A623' : '#D97706';

  return (
    <div className="space-y-6">
      {/* Forecast Controls Header */}
      <div className="p-5 sm:p-6 rounded-2xl glass-card border border-[var(--card-border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              Predictive Treasury Modeling
            </span>
            {duplicateHoldExecuted && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800/40 px-2 py-0.5 rounded">
                +₹6.8 L Duplicate Hold Applied
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Multi-Horizon Cash-Flow & Working Capital Projections
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Stochastic projections factoring seasonality, payment terms, and vendor cluster disbursements
          </p>
        </div>

        {/* Horizon & Scenario Switchers */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Horizon Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--surface-muted)] border border-[var(--divider)] text-xs">
            <button
              onClick={() => setHorizonDays(30)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                horizonDays === 30 ? 'bg-[#F59E0B] text-black font-bold shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              30d
            </button>
            <button
              onClick={() => setHorizonDays(60)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                horizonDays === 60 ? 'bg-[#F59E0B] text-black font-bold shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              60d
            </button>
            <button
              onClick={() => setHorizonDays(90)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                horizonDays === 90 ? 'bg-[#F59E0B] text-black font-bold shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              90d
            </button>
          </div>

          {/* Scenario Mode Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--surface-muted)] border border-[var(--divider)] text-xs">
            <button
              onClick={() => setScenarioMode('conservative')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                scenarioMode === 'conservative'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/50 font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Conservative
            </button>
            <button
              onClick={() => setScenarioMode('base')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                scenarioMode === 'base'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/50 font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Base Case
            </button>
            <button
              onClick={() => setScenarioMode('optimistic')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                scenarioMode === 'optimistic'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50 font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Optimistic
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Current Liquid Cash"
          value={formatINRCompact(availableCash)}
          subtitle="Cleared bank ledger balances"
          change={{ value: '+4.2%', isPositive: true }}
          exactValueTooltip={`Exact: ${formatINR(availableCash)}`}
        />

        <KPICard
          title={`Projected ${horizonDays}-Day Ending`}
          value={formatINRCompact(stats.endingCash)}
          subtitle={`Under ${scenarioMode} assumptions`}
          change={{
            value: formatPercent(((stats.endingCash - availableCash) / availableCash) * 100),
            isPositive: stats.endingCash >= availableCash
          }}
          exactValueTooltip={`Exact: ${formatINR(stats.endingCash)}`}
        />

        <KPICard
          title="Expected Lowest Point"
          value={formatINRCompact(stats.lowest)}
          subtitle={`Projected on ${formatDate(stats.lowestDate)}`}
          alertLevel={stats.lowest < 3000000 ? 'warning' : 'none'}
          exactValueTooltip={`Exact: ${formatINR(stats.lowest)}`}
        />

        <KPICard
          title="Potential Shortfall Window"
          value={stats.shortfallDate ? formatDate(stats.shortfallDate) : 'Zero Shortfall'}
          subtitle={stats.shortfallDate ? 'Liquidity dips under ₹25L reserve' : 'Healthy liquidity buffer retained'}
          alertLevel={stats.shortfallDate ? 'critical' : 'none'}
        />
      </div>

      {/* Primary Forecast Chart */}
      <ChartCard
        title={`Cash Balance Trajectory (${horizonDays} Days)`}
        action={
          <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-[var(--surface-muted)] text-[var(--text-secondary)] capitalize border border-[var(--divider)]">
            {scenarioMode}
          </span>
        }
      >
        <div className="h-80 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={displayedPoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="var(--text-muted)"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                stroke="var(--text-muted)"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickLine={false}
                tickFormatter={(val) => formatINRCompact(val)}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--chart-tooltip-bg)',
                  borderColor: 'var(--chart-tooltip-border)',
                  borderRadius: '12px',
                  color: 'var(--chart-tooltip-text)',
                  fontSize: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                }}
                formatter={(val: any) => [formatINR(Number(val)), 'Cash Level']}
              />
              <Area
                type="monotone"
                dataKey="upperBand"
                stroke="none"
                fill={forecastLineColor}
                fillOpacity={actualTheme === 'dark' ? 0.08 : 0.06}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke={actualLineColor}
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke={forecastLineColor}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Aging Analysis: Receivables vs Payables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Receivables Aging */}
        <div className="p-5 sm:p-6 rounded-2xl glass-card space-y-4 border border-[var(--card-border)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Receivables Aging (Inflows)</h3>
              <p className="text-xs text-[var(--text-secondary)]">Total outstanding client receipts: ₹2.20 Cr</p>
            </div>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">92% Collectible</span>
          </div>

          <div className="space-y-3">
            {INITIAL_RECEIVABLES_AGING.map(bucket => (
              <div key={bucket.range} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">{bucket.range} ({bucket.count} Invoices)</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">{formatINR(bucket.amount)}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${bucket.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payables Aging */}
        <div className="p-5 sm:p-6 rounded-2xl glass-card space-y-4 border border-[var(--card-border)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Payables Aging (Outflows)</h3>
              <p className="text-xs text-[var(--text-secondary)]">Total committed vendor liabilities: ₹1.49 Cr</p>
            </div>
            <span className="text-xs font-mono text-amber-600 dark:text-amber-400 font-semibold">DSO: 28 Days</span>
          </div>

          <div className="space-y-3">
            {INITIAL_PAYABLES_AGING.map(bucket => (
              <div key={bucket.range} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">{bucket.range} ({bucket.count} Invoices)</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">{formatINR(bucket.amount)}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                  <div
                    className="h-full bg-[#F59E0B] rounded-full"
                    style={{ width: `${bucket.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Forecast Drivers & Assumptions Box */}
      <div className="p-5 rounded-2xl glass-card border border-[var(--card-border)] space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Underlying Telemetry & Modeling Drivers</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[var(--text-secondary)]">
          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider)] space-y-1">
            <span className="font-semibold text-[var(--text-primary)] block">Collections Cadence</span>
            <p>Enterprise customer contracts adhere to Net-30 payment terms with 8% historical variance delay in Q3.</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider)] space-y-1">
            <span className="font-semibold text-[var(--text-primary)] block">Bi-Monthly Payroll Clustering</span>
            <p>Fixed workforce disbursements of ₹42,00,000 scheduled on the 1st and 15th of each calendar month.</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider)] space-y-1">
            <span className="font-semibold text-[var(--text-primary)] block">Duplicate Hold Impact</span>
            <p>
              {duplicateHoldExecuted
                ? 'Holding duplicate #INV-2024-8849 saved ₹6,80,000, preserving cash cushion above the critical reserve line.'
                : 'Unaddressed duplicate invoice #INV-2024-8849 is modeled as an impending ₹6,80,000 drain on Day 4.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
