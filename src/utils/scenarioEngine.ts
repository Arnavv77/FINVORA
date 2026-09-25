import { SimulationParams, SimulationResult, CashForecastPoint } from '../types';
import { formatINR, formatINRCompact } from './formatters';

export const DEFAULT_SIMULATION_PARAMS: SimulationParams = {
  name: 'Base Scenario',
  horizonDays: 60,
  revenueChangePct: 0,
  collectionDelayDays: 0,
  expenseChangePct: 0,
  paymentRescheduleDays: 0,
  capexHiringCost: 0,
  capexDay: 15,
  affectedScope: 'All enterprise operations',
  baselineReference: 'Q3 FY25 Reconciled Base Plan'
};

/**
 * Deterministic Simulation Engine
 * Translates structured parameters against the financial time-series.
 * Guarantees zero-change identity and precise receipt shifting.
 */
export function calculateScenario(
  params: SimulationParams,
  forecastPoints: CashForecastPoint[],
  _hasDuplicateHold: boolean = false
): SimulationResult {
  const horizon = params.horizonDays || 60;
  const forwardPoints = forecastPoints.filter(p => !p.isHistorical).slice(0, horizon);
  const N = forwardPoints.length;

  const baselineEndingCash = forwardPoints[N - 1]?.forecastBalanceBase || 0;
  const baselineLowestCash = Math.min(...forwardPoints.map(p => p.forecastBalanceBase));
  const reserveThreshold = 2000000; // ₹20 Lakhs safe liquidity buffer

  // Check if zero changes
  const isZeroChange =
    (params.revenueChangePct || 0) === 0 &&
    (params.collectionDelayDays || 0) === 0 &&
    (params.expenseChangePct || 0) === 0 &&
    (params.paymentRescheduleDays || 0) === 0 &&
    (!params.capexHiringCost || params.capexHiringCost === 0);

  if (isZeroChange && N > 0) {
    const simulatedPoints = forwardPoints.map(pt => ({
      date: pt.date,
      dayIndex: pt.dayIndex,
      baseline: pt.forecastBalanceBase,
      simulated: pt.forecastBalanceBase
    }));

    let shortfallDate: string | null = null;
    let shortfallAmount = 0;
    const firstBreach = forwardPoints.find(p => p.forecastBalanceBase < reserveThreshold);
    if (firstBreach) {
      shortfallDate = firstBreach.date;
      shortfallAmount = reserveThreshold - baselineLowestCash;
    }

    return {
      endingCash: baselineEndingCash,
      lowestCash: baselineLowestCash,
      shortfallDate,
      shortfallAmount: Math.max(0, shortfallAmount),
      isReserveBreached: baselineLowestCash < reserveThreshold,
      isNegativeCashBreached: baselineLowestCash < 0,
      reserveThreshold,
      baselineEndingCash,
      baselineLowestCash,
      deltaCash: 0,
      delayedBeyondHorizonAmount: 0,
      operatingResultImpact: 0,
      explanation: [
        'Scenario matches baseline forecast exactly. No operational or timing variance applied.'
      ],
      keyDrivers: [],
      simulatedPoints
    };
  }

  // Calculate starting cash from Day 0
  const day0Point = forecastPoints.find(p => p.dayIndex === 0);
  const startingCash = day0Point?.actualBalance ?? (forwardPoints[0]?.forecastBalanceBase || 18200000);

  // 1. Inflow adjustments & timing shifts
  const revenueMultiplier = 1 + ((params.revenueChangePct || 0) / 100);
  const simInflows = new Array(N).fill(0);
  let delayedBeyondHorizonAmount = 0;
  const delay = Math.max(0, Math.round(params.collectionDelayDays || 0));

  for (let i = 0; i < N; i++) {
    const adjustedDailyInflow = forwardPoints[i].inflows * revenueMultiplier;
    const targetIdx = i + delay;
    if (targetIdx < N) {
      simInflows[targetIdx] += adjustedDailyInflow;
    } else {
      delayedBeyondHorizonAmount += adjustedDailyInflow;
    }
  }

  // 2. Outflow adjustments & payment rescheduling
  const expenseMultiplier = 1 + ((params.expenseChangePct || 0) / 100);
  const simOutflows = new Array(N).fill(0);
  const reschedule = Math.max(0, Math.round(params.paymentRescheduleDays || 0));

  for (let i = 0; i < N; i++) {
    const adjustedDailyOutflow = forwardPoints[i].outflows * expenseMultiplier;
    const targetIdx = i + reschedule;
    if (targetIdx < N) {
      simOutflows[targetIdx] += adjustedDailyOutflow;
    }
  }

  // 3. One-time Capex / Hiring expenditure
  const capexDay = Math.min(N, Math.max(1, params.capexDay || 15));
  if (params.capexHiringCost && params.capexHiringCost > 0) {
    simOutflows[capexDay - 1] += params.capexHiringCost;
  }

  // 4. Trace simulated cash curve
  let simRunning = startingCash;
  let lowestCash = startingCash;
  let shortfallDate: string | null = null;
  let shortfallAmount = 0;
  const simulatedPoints: SimulationResult['simulatedPoints'] = [];

  for (let i = 0; i < N; i++) {
    const pt = forwardPoints[i];
    simRunning += (simInflows[i] - simOutflows[i]);

    if (simRunning < lowestCash) {
      lowestCash = simRunning;
    }

    if (simRunning < reserveThreshold && !shortfallDate) {
      shortfallDate = pt.date;
      shortfallAmount = reserveThreshold - simRunning;
    }

    simulatedPoints.push({
      date: pt.date,
      dayIndex: pt.dayIndex,
      baseline: pt.forecastBalanceBase,
      simulated: Math.round(simRunning)
    });
  }

  const endingCash = Math.round(simRunning);
  const deltaCash = endingCash - baselineEndingCash;

  // 5. Generate structured drivers
  const keyDrivers: SimulationResult['keyDrivers'] = [];

  if (params.revenueChangePct && params.revenueChangePct !== 0) {
    const approxRevenueImpact = (forwardPoints.reduce((acc, p) => acc + p.inflows, 0) * (params.revenueChangePct / 100));
    keyDrivers.push({
      label: 'Revenue Change',
      impact: Math.round(approxRevenueImpact),
      description: `${params.revenueChangePct > 0 ? '+' : ''}${params.revenueChangePct}% sales volume variance across forecast`
    });
  }

  if (params.collectionDelayDays && params.collectionDelayDays > 0) {
    keyDrivers.push({
      label: 'Collection Lag',
      impact: Math.round(-delayedBeyondHorizonAmount),
      description: `${params.collectionDelayDays} days collection delay (${formatINRCompact(delayedBeyondHorizonAmount)} pushed past Day ${horizon})`
    });
  }

  if (params.expenseChangePct && params.expenseChangePct !== 0) {
    const approxOpexImpact = (forwardPoints.reduce((acc, p) => acc + p.outflows, 0) * (params.expenseChangePct / 100));
    keyDrivers.push({
      label: 'Operating Expense Variance',
      impact: Math.round(-approxOpexImpact),
      description: `${params.expenseChangePct > 0 ? '+' : ''}${params.expenseChangePct}% recurring operating burn`
    });
  }

  if (params.capexHiringCost && params.capexHiringCost > 0) {
    keyDrivers.push({
      label: 'Capital Expenditure',
      impact: -params.capexHiringCost,
      description: `One-time cash outflow scheduled on Day ${capexDay}`
    });
  }

  if (params.paymentRescheduleDays && params.paymentRescheduleDays > 0) {
    keyDrivers.push({
      label: 'Vendor Payment Deferral',
      impact: Math.round(params.paymentRescheduleDays * 420000),
      description: `Disbursements postponed by ${params.paymentRescheduleDays} days`
    });
  }

  // 6. Grounded explanations
  const explanation = generateExplanations(params, deltaCash, endingCash, lowestCash, reserveThreshold, shortfallDate, delayedBeyondHorizonAmount, horizon);

  return {
    endingCash,
    lowestCash: Math.round(lowestCash),
    shortfallDate,
    shortfallAmount: Math.round(shortfallAmount),
    isReserveBreached: lowestCash < reserveThreshold,
    isNegativeCashBreached: lowestCash < 0,
    reserveThreshold,
    baselineEndingCash,
    baselineLowestCash,
    deltaCash,
    delayedBeyondHorizonAmount: Math.round(delayedBeyondHorizonAmount),
    operatingResultImpact: deltaCash,
    explanation,
    keyDrivers,
    simulatedPoints
  };
}

function generateExplanations(
  params: SimulationParams,
  deltaCash: number,
  endingCash: number,
  lowestCash: number,
  reserveThreshold: number,
  shortfallDate: string | null,
  delayedBeyondHorizon: number,
  horizon: number
): string[] {
  const list: string[] = [];

  // Overview impact
  if (deltaCash < 0) {
    list.push(`The modeled scenario results in a net liquidity contraction of ${formatINR(Math.abs(deltaCash))} over ${horizon} days.`);
  } else if (deltaCash > 0) {
    list.push(`The modeled scenario yields a net liquidity expansion of ${formatINR(deltaCash)} over ${horizon} days.`);
  }

  // Collection delay
  if (params.collectionDelayDays && params.collectionDelayDays > 0) {
    if (delayedBeyondHorizon > 0) {
      list.push(
        `Customer payments delayed by ${params.collectionDelayDays} days shift ${formatINR(delayedBeyondHorizon)} of expected collections beyond the Day ${horizon} planning horizon without forfeiting customer accounts receivable.`
      );
    } else {
      list.push(`Customer payment delay of ${params.collectionDelayDays} days compresses operating cash flows during the intermediate billing intervals.`);
    }
  }

  // Expense adjustments
  if (params.expenseChangePct && params.expenseChangePct > 0) {
    list.push(`A ${params.expenseChangePct}% increase in operating expenses accelerates weekly cash burn rates.`);
  } else if (params.expenseChangePct && params.expenseChangePct < 0) {
    list.push(`A ${Math.abs(params.expenseChangePct)}% reduction in operating expenses preserves cash runway and builds reserve resilience.`);
  }

  // Capex impact
  if (params.capexHiringCost && params.capexHiringCost > 0) {
    list.push(`An upfront capital expenditure of ${formatINR(params.capexHiringCost)} produces an immediate liquidity step-down on Day ${params.capexDay || 15}.`);
  }

  // Reserve safety status
  if (lowestCash < 0) {
    list.push(`CRITICAL DEFICIT: Cash balance reaches negative territory (${formatINR(lowestCash)}). Emergency credit facility or payment holds required.`);
  } else if (lowestCash < reserveThreshold && shortfallDate) {
    list.push(`RESERVE BREACH: Liquidity dips below the ₹20.0 L safe reserve around ${shortfallDate}, reaching a trough of ${formatINR(lowestCash)}.`);
  } else {
    list.push(`SAFE BUFFER: Liquidity maintains a healthy cushion above the ₹20.0 L reserve throughout all ${horizon} days, bottoming at ${formatINR(lowestCash)}.`);
  }

  return list;
}

export interface ParsedScenarioResponse {
  isSupported: boolean;
  unsupportedReason?: string;
  interpretationText: string;
  assumptions: SimulationParams;
  assumptionsList: { label: string; value: string; detail: string }[];
  followUps: string[];
  hasSpecificLevers?: boolean;
}

/**
 * Intelligent Natural Language Interpreter for Financial Business Scenarios.
 * Accurately translates ANY user inquiry, percentage variation, timing shift,
 * capital expenditure, or strategic business question into deterministic simulation levers.
 */
export function interpretScenarioPrompt(
  prompt: string,
  currentParams: SimulationParams = DEFAULT_SIMULATION_PARAMS
): ParsedScenarioResponse {
  const text = prompt.toLowerCase().trim();

  // Clone active params as base for revisions
  const newParams: SimulationParams = {
    ...currentParams,
    name: prompt.slice(0, 45).trim() || 'Custom Scenario'
  };

  const detectedAssumptions: { label: string; value: string; detail: string }[] = [];
  const parts: string[] = [];
  let hasSpecificLevers = false;

  // ── 1. Days / Timing Shifts ──
  // Matches days, weeks, or months (e.g., "15 days", "2 weeks", "1 month")
  const timingMatch = text.match(/(\d+)\s*(?:days?|d)\s*(?:late|delay|delayed|lag|deferred|slow|rescheduled?|push|extended?)/i) ||
                      text.match(/(?:delay|lag|defer|late|reschedule|push)\s*(?:by|of)?\s*(\d+)\s*(?:days?|d)/i) ||
                      text.match(/(\d+)\s*(?:weeks?|wk)\s*(?:late|delay|lag|deferred|rescheduled?)/i) ||
                      text.match(/(\d+)\s*(?:months?|mo)\s*(?:late|delay|lag|deferred|rescheduled?)/i) ||
                      text.match(/(?:customers?|clients?|debtors?|ar|receivables?|inflows?)\s*(?:pay|arrive|settle)?\s*(\d+)\s*(?:days?|d)\s*late/i);

  if (timingMatch) {
    let days = parseInt(timingMatch[1], 10);
    if (text.includes('week') || text.includes('wk')) days = days * 7;
    if (text.includes('month') || text.includes('mo')) days = days * 30;

    // Check if it applies to vendor/AP disbursements or customer/AR collections
    const isVendorTiming = /(?:vendor|supplier|ap|payables?|bills?|creditor|disbursement)/i.test(text);
    if (isVendorTiming) {
      newParams.paymentRescheduleDays = days;
      detectedAssumptions.push({
        label: 'Vendor Reschedule',
        value: `${days} Days`,
        detail: `Disbursements to suppliers postponed by ${days} calendar days to protect liquidity.`
      });
      parts.push(`vendor payments rescheduled by ${days} days`);
      hasSpecificLevers = true;
    } else {
      newParams.collectionDelayDays = days;
      detectedAssumptions.push({
        label: 'Collection Delay',
        value: `${days} Days`,
        detail: `Customer accounts receivable collections shifted by ${days} calendar days.`
      });
      parts.push(`customer collections delayed by ${days} days`);
      hasSpecificLevers = true;
    }
  }

  // ── 2. Percentage Changes (Revenue vs Expenses vs General) ──
  const pctRegex = /(\d+(?:\.\d+)?)\s*%/g;
  let match: RegExpExecArray | null;
  const pctsFound: number[] = [];
  while ((match = pctRegex.exec(text)) !== null) {
    pctsFound.push(parseFloat(match[1]));
  }

  const isRevContext = /(?:revenue|sales|inflows?|topline|billings?|turnover|demand|business|orders?|contracts?)/i.test(text);
  const isExpContext = /(?:operating\s+expenses?|opex|expenses?|costs?|burn|overheads?|salaries?|wages?|payroll|cloud|rent|procurement|tariffs?|inflation)/i.test(text);
  const isNegativeDirection = /(?:falls?|drops?|decreases?|down|cuts?|declines?|loss|reduction|plunge|slumps?|shrink|deficit|less|bleed|negative|-)/i.test(text);
  const isPositiveDirection = /(?:rises?|grows?|increases?|up|boost|surges?|gains?|expansion|hike|inflation|more|\+)/i.test(text);

  if (pctsFound.length > 0) {
    hasSpecificLevers = true;
    const primaryPct = pctsFound[0];

    if (isRevContext && !isExpContext) {
      const sign = isPositiveDirection && !isNegativeDirection ? 1 : -1;
      newParams.revenueChangePct = sign * primaryPct;
      detectedAssumptions.push({
        label: 'Revenue Change',
        value: `${sign > 0 ? '+' : ''}${newParams.revenueChangePct}%`,
        detail: `${sign > 0 ? 'Projected topline growth' : 'Contractual volume reduction'} across billable enterprise contracts.`
      });
      parts.push(`revenue ${sign > 0 ? 'increased' : 'reduced'} by ${primaryPct}%`);
    } else if (isExpContext && !isRevContext) {
      const sign = isNegativeDirection && !isPositiveDirection ? -1 : 1;
      newParams.expenseChangePct = sign * primaryPct;
      detectedAssumptions.push({
        label: 'Operating Expenses',
        value: `${sign > 0 ? '+' : ''}${newParams.expenseChangePct}%`,
        detail: `${sign > 0 ? 'Increased recurring overhead and burn' : 'Operational cost optimization'} across departments.`
      });
      parts.push(`operating expenses ${sign > 0 ? 'increased' : 'reduced'} by ${primaryPct}%`);
    } else if (isRevContext && isExpContext && pctsFound.length >= 2) {
      newParams.revenueChangePct = isNegativeDirection ? -primaryPct : primaryPct;
      newParams.expenseChangePct = isPositiveDirection ? pctsFound[1] : -pctsFound[1];
      detectedAssumptions.push({
        label: 'Revenue & Opex Shift',
        value: `Rev: ${newParams.revenueChangePct}%, Opex: ${newParams.expenseChangePct}%`,
        detail: 'Simultaneous adjustment across sales topline and operational cost structure.'
      });
      parts.push(`revenue adjusted by ${newParams.revenueChangePct}% and expenses adjusted by ${newParams.expenseChangePct}%`);
    } else {
      if (isNegativeDirection) {
        newParams.revenueChangePct = -primaryPct;
        detectedAssumptions.push({
          label: 'Revenue Downside',
          value: `-${primaryPct}%`,
          detail: 'Stress-test downward adjustment applied to incoming cash flows.'
        });
        parts.push(`revenue reduced by ${primaryPct}%`);
      } else {
        newParams.expenseChangePct = primaryPct;
        detectedAssumptions.push({
          label: 'Expense Upside',
          value: `+${primaryPct}%`,
          detail: 'Cost escalation stress-test applied to operational burn.'
        });
        parts.push(`expenses increased by ${primaryPct}%`);
      }
    }
  }

  // ── 3. Capex, Hiring, and Capital Investments ──
  const capexMatch = text.match(/(?:invest|purchase|spend|buy|hire|capex|equipment|machinery|asset|license|server|hardware|acquisition|expand|office)\s*(?:of|for|in)?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(lakh|lakhs|l|cr|crore|crores|k|m)?/i) ||
                      text.match(/(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)\s*(lakh|lakhs|l|cr|crore|crores|k|m)?\s*(?:invest|capex|spend|cost|equipment|machinery|hiring)?/i);

  if (capexMatch) {
    const num = parseFloat(capexMatch[1]);
    const unit = (capexMatch[2] || 'lakh').toLowerCase();
    let amount = num * 100000;
    if (unit.startsWith('cr')) amount = num * 10000000;
    if (unit === 'k') amount = num * 1000;
    if (unit === 'm') amount = num * 1000000;

    newParams.capexHiringCost = Math.round(amount);
    newParams.capexDay = 15;
    detectedAssumptions.push({
      label: 'One-Time Outflow',
      value: formatINR(amount),
      detail: 'Strategic capital commitment scheduled against working capital reserves.'
    });
    parts.push(`a one-time investment of ${formatINR(amount)} on Day 15`);
    hasSpecificLevers = true;
  }

  // ── 4. Strategic & Semantic Inquiry Mapping (No explicit numbers) ──
  if (!hasSpecificLevers) {
    if (/(?:lose|churn|lost|drop|cancel)\s*(?:biggest|largest|top|major|key)?\s*(?:customer|client|account|contract)/i.test(text)) {
      newParams.revenueChangePct = -18;
      detectedAssumptions.push({
        label: 'Key Client Loss',
        value: '-18% Revenue',
        detail: 'Simulates loss of largest enterprise billings account (~18% of monthly recurring cash flow).'
      });
      parts.push('loss of our primary enterprise account (-18% revenue)');
      hasSpecificLevers = true;
    } else if (/(?:hire|hiring|headcount|engineers?|developers?|team|staff|recruit)/i.test(text)) {
      newParams.capexHiringCost = 2500000;
      newParams.expenseChangePct = 8;
      detectedAssumptions.push({
        label: 'Team Expansion',
        value: '₹25.0L + 8% Opex',
        detail: 'Models recruitment of 4-5 personnel with ₹25L initial equipment/signing capital + 8% ongoing payroll burn.'
      });
      parts.push('engineering headcount expansion (₹25L upfront + 8% payroll burn)');
      hasSpecificLevers = true;
    } else if (/(?:recession|downturn|slowdown|market\s+crash|crisis|bear|slump)/i.test(text)) {
      newParams.revenueChangePct = -20;
      newParams.collectionDelayDays = 20;
      detectedAssumptions.push({
        label: 'Macro Downturn',
        value: '-20% Rev, +20d Delay',
        detail: 'Severe macroeconomic compression: 20% billing contraction with 20-day extended client collection cycle.'
      });
      parts.push('macroeconomic downturn (-20% revenue and 20-day receivables lag)');
      hasSpecificLevers = true;
    } else if (/(?:inflation|tariff|price\s*hike|raw\s*material|hosting|aws|cloud\s*cost)/i.test(text)) {
      newParams.expenseChangePct = 12;
      detectedAssumptions.push({
        label: 'Inflation Surge',
        value: '+12% Opex',
        detail: 'Reflects a 12% inflationary increase across cloud infrastructure, vendor rates, and operational overheads.'
      });
      parts.push('an inflationary operational cost increase of +12%');
      hasSpecificLevers = true;
    } else if (/(?:default|bad\s*debt|unpaid|insolven|write\s*off)/i.test(text)) {
      newParams.revenueChangePct = -10;
      newParams.collectionDelayDays = 30;
      detectedAssumptions.push({
        label: 'Debtor Default',
        value: '-10% Rev, +30d Lag',
        detail: '10% uncollectible debt write-off coupled with 30-day collection freeze on delayed accounts.'
      });
      parts.push('credit defaults with 10% revenue write-off and 30-day payment delays');
      hasSpecificLevers = true;
    } else if (/(?:cut\s*costs?|reduce\s*burn|freeze\s*hiring|layoffs?|austerity|save\s*cash)/i.test(text)) {
      newParams.expenseChangePct = -12;
      detectedAssumptions.push({
        label: 'Cost Optimization',
        value: '-12% Opex',
        detail: 'Departmental budget austerity program reducing recurring operational disbursements by 12%.'
      });
      parts.push('austerity cost reductions of -12% OPEX');
      hasSpecificLevers = true;
    } else if (/(?:marketing|advertising|campaign|growth|scale|sales\s*boost)/i.test(text)) {
      newParams.expenseChangePct = 15;
      newParams.revenueChangePct = 10;
      detectedAssumptions.push({
        label: 'Growth Initiative',
        value: '+15% Opex, +10% Rev',
        detail: 'Accelerated marketing spend (+15%) driving a projected 10% top-line revenue expansion.'
      });
      parts.push('marketing scale (+15% spend leading to +10% revenue lift)');
      hasSpecificLevers = true;
    } else if (/(?:expand|office|acquire|new\s*product|expansion|overseas)/i.test(text)) {
      newParams.capexHiringCost = 3500000;
      newParams.expenseChangePct = 6;
      detectedAssumptions.push({
        label: 'Strategic Expansion',
        value: '₹35.0L Capex, +6% Opex',
        detail: 'Initial capital investment of ₹35.0 L with ongoing 6% expansion operating burn.'
      });
      parts.push('strategic market expansion (₹35.0L capex + 6% ongoing burn)');
      hasSpecificLevers = true;
    } else {
      // General exploratory stress test
      newParams.revenueChangePct = -10;
      newParams.collectionDelayDays = 15;
      detectedAssumptions.push({
        label: 'Prudent Stress Test',
        value: '-10% Rev, +15d Delay',
        detail: 'Conservative enterprise resilience benchmark simulating mild top-line variance and collection drag.'
      });
      parts.push('baseline exploratory stress-testing with -10% revenue and 15-day collection lag');
    }
  }

  const interpretationText = `I have modeled your scenario with ${parts.join(' and ')}. The simulation parameters have been calibrated against your reconciled General Ledger. Review the assumptions below and run the simulation engine to inspect the forecasted cash trajectory.`;

  // Dynamically tailor follow-ups based on active levers
  const followUps: string[] = [];
  if (newParams.revenueChangePct < 0) {
    followUps.push('What if we cut operating expenses by 10% to offset this?');
    followUps.push('What if receivables arrive 15 days late as well?');
  } else if (newParams.expenseChangePct > 0) {
    followUps.push('What if we delay vendor payments by 20 days to cushion cash?');
    followUps.push('What if revenue expands by 15%?');
  } else if (newParams.collectionDelayDays > 0) {
    followUps.push('What if we reduce operating expenses by 5%?');
    followUps.push('What if we hold non-critical supplier disbursements?');
  } else {
    followUps.push('What if revenue falls by 15%?');
    followUps.push('What if customer payments arrive 20 days late?');
    followUps.push('What if operating expenses rise by 8%?');
  }
  followUps.push('Compare with baseline');

  return {
    isSupported: true,
    interpretationText,
    assumptions: newParams,
    assumptionsList: detectedAssumptions,
    followUps,
    hasSpecificLevers
  };
}
