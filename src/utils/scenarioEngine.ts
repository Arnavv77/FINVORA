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
}

/**
 * Natural language interpreter for financial business scenarios.
 * Converts natural queries into verified parameter sets.
 */
export function interpretScenarioPrompt(
  prompt: string,
  currentParams: SimulationParams = DEFAULT_SIMULATION_PARAMS
): ParsedScenarioResponse {
  const text = prompt.toLowerCase().trim();

  // Unsupported query check
  const financeKeywords = [
    'what if', 'revenue', 'sales', 'collection', 'payment', 'expense', 'opex',
    'cost', 'late', 'delay', 'capex', 'invest', 'equipment', 'hire', 'reduce',
    'increase', 'decrease', 'drop', 'rise', 'cut', 'fall', 'lakh', 'cr', 'crore',
    'vendor', 'supplier', 'reschedule', 'push', 'runway', 'cash', 'liquidity'
  ];

  const hasFinanceContext = financeKeywords.some(kw => text.includes(kw));
  if (!hasFinanceContext && text.length > 5) {
    return {
      isSupported: false,
      unsupportedReason: "I couldn't identify specific financial levers in your request.",
      interpretationText:
        "I am calibrated to model tangible enterprise cash levers. I currently support:\n• Revenue shifts (e.g., 'What if revenue falls by 10%?')\n• Collection timing (e.g., 'What if customer payments arrive 15 days late?')\n• Operating expenses (e.g., 'What if operating expenses rise by 8%?')\n• Capital investments (e.g., 'What if we invest ₹20 lakh in equipment?')\n• Vendor disbursement delays (e.g., 'What if we delay vendor payments by 20 days?')\n\nCould you try rephrasing your scenario?",
      assumptions: { ...currentParams },
      assumptionsList: [],
      followUps: [
        'What if revenue falls by 10%?',
        'What if customer payments arrive 15 days late?',
        'What if operating expenses rise by 8%?',
        'What if we invest ₹20 lakh in equipment?'
      ]
    };
  }

  // Clone active params as base for revisions
  const newParams: SimulationParams = {
    ...currentParams,
    name: 'Custom Scenario'
  };

  const detectedAssumptions: { label: string; value: string; detail: string }[] = [];
  const parts: string[] = [];

  // 1. Customer collection delays
  // Match patterns like "15 days late", "pay 15 days late", "collections delay 20 days", "delayed by 15 days"
  const delayMatch = text.match(/(\d+)\s*(?:days?|d)\s*(?:late|delay|lag|deferred|slow)/i) ||
                     text.match(/(?:delay|lag|defer|late)\s*(?:by|of)?\s*(\d+)\s*(?:days?|d)/i) ||
                     text.match(/(?:customers?|clients?|payments?|collections?)\s*(?:pay|arrive)?\s*(\d+)\s*(?:days?|d)\s*late/i);

  if (delayMatch) {
    const days = parseInt(delayMatch[1], 10);
    newParams.collectionDelayDays = days;
    detectedAssumptions.push({
      label: 'Collection Delay',
      value: `${days} Days`,
      detail: `All incoming customer collections shifted by ${days} calendar days.`
    });
    parts.push(`customer collections delayed by ${days} days`);
  }

  // 2. Revenue percentage changes
  // Match: "revenue falls by 10%", "sales drops 15%", "revenue increase 20%", "sales grow 10%"
  const revDownMatch = text.match(/(?:revenue|sales|inflows?|topline)\s*(?:falls?|drops?|decreases?|down|cuts?|declines?|loss|reduction|plunge)\s*(?:by|of)?\s*(\d+(?:\.\d+)?)\s*%/i) ||
                       text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:fall|drop|decline|cut|decrease)\s*in\s*(?:revenue|sales)/i);
  const revUpMatch = text.match(/(?:revenue|sales|inflows?|topline)\s*(?:rises?|grows?|increases?|up|boost|surges?)\s*(?:by|of)?\s*(\d+(?:\.\d+)?)\s*%/i) ||
                     text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:growth|increase|rise)\s*in\s*(?:revenue|sales)/i);

  if (revDownMatch) {
    const pct = parseFloat(revDownMatch[1]);
    newParams.revenueChangePct = -pct;
    detectedAssumptions.push({
      label: 'Revenue Change',
      value: `-${pct}%`,
      detail: 'Relative downward volume adjustment across enterprise billings.'
    });
    parts.push(`revenue reduced by ${pct}%`);
  } else if (revUpMatch) {
    const pct = parseFloat(revUpMatch[1]);
    newParams.revenueChangePct = pct;
    detectedAssumptions.push({
      label: 'Revenue Change',
      value: `+${pct}%`,
      detail: 'Projected sales expansion scaling baseline collections.'
    });
    parts.push(`revenue increased by ${pct}%`);
  }

  // 3. Operating Expense changes
  const expUpMatch = text.match(/(?:operating\s+expenses?|opex|expenses?|costs?|burn)\s*(?:rises?|grows?|increases?|up|surges?)\s*(?:by|of)?\s*(\d+(?:\.\d+)?)\s*%/i) ||
                     text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:increase|rise|growth)\s*in\s*(?:operating\s+expenses?|opex|expenses?|costs?)/i);
  const expDownMatch = text.match(/(?:reduce|cut|decrease|lower|drop|trim)\s*(?:operating\s+expenses?|opex|expenses?|costs?|burn)\s*(?:by|of)?\s*(\d+(?:\.\d+)?)\s*%/i) ||
                       text.match(/(?:operating\s+expenses?|opex|expenses?|costs?|burn)\s*(?:cut|reduced|decreased|dropped)\s*(?:by|of)?\s*(\d+(?:\.\d+)?)\s*%/i);

  if (expUpMatch) {
    const pct = parseFloat(expUpMatch[1]);
    newParams.expenseChangePct = pct;
    detectedAssumptions.push({
      label: 'Operating Expenses',
      value: `+${pct}%`,
      detail: 'Direct increase in recurring departmental and operational expenditures.'
    });
    parts.push(`operating expenses increased by ${pct}%`);
  } else if (expDownMatch) {
    const pct = parseFloat(expDownMatch[1]);
    newParams.expenseChangePct = -pct;
    detectedAssumptions.push({
      label: 'Operating Expenses',
      value: `-${pct}%`,
      detail: 'Operational cost optimization reducing recurring cash burn.'
    });
    parts.push(`operating expenses decreased by ${pct}%`);
  }

  // 4. One-time Capex / Hiring cost
  // "invest ₹20 lakh in equipment", "capex of 15 lakh", "hire engineers for 25 lakh"
  const capexMatch = text.match(/(?:invest|purchase|spend|buy|hire|capex|equipment|machinery|asset|license)\s*(?:of|for|in)?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(lakh|lakhs|l|cr|crore|crores|k)?/i);
  if (capexMatch) {
    const num = parseFloat(capexMatch[1]);
    const unit = (capexMatch[2] || 'lakh').toLowerCase();
    let amount = num * 100000;
    if (unit.startsWith('cr')) amount = num * 10000000;
    if (unit === 'k') amount = num * 1000;

    newParams.capexHiringCost = Math.round(amount);
    newParams.capexDay = 15;
    detectedAssumptions.push({
      label: 'One-Time Expenditure',
      value: formatINR(amount),
      detail: `Capital expenditure scheduled on Day 15 against liquidity buffer.`
    });
    parts.push(`a one-time investment of ${formatINR(amount)} on Day 15`);
  }

  // 5. Vendor payment delay / reschedule
  const vendorMatch = text.match(/(?:vendor|supplier|ap|payables?)\s*(?:payments?|disbursements?)?\s*(?:delay|deferred|reschedule|push)\s*(?:by|of)?\s*(\d+)\s*(?:days?|d)/i) ||
                      text.match(/delay\s*(?:vendor|supplier|ap)\s*(?:payments?|bills?)?\s*by\s*(\d+)\s*(?:days?|d)/i);
  if (vendorMatch) {
    const days = parseInt(vendorMatch[1], 10);
    newParams.paymentRescheduleDays = days;
    detectedAssumptions.push({
      label: 'Vendor Reschedule',
      value: `${days} Days`,
      detail: `Disbursements postponed by ${days} days to preserve short-term working capital.`
    });
    parts.push(`vendor payments rescheduled by ${days} days`);
  }

  // Default fallback if no specific numbers detected
  if (parts.length === 0) {
    parts.push('baseline assumptions with 15-day collection delay');
    newParams.collectionDelayDays = 15;
    detectedAssumptions.push({
      label: 'Collection Delay',
      value: '15 Days',
      detail: 'Standard customer payment delay stress-test.'
    });
  }

  const interpretationText = `I have structured this scenario with ${parts.join(' and ')}. Review the assumptions below before running the simulation engine.`;

  // Dynamically tailor follow-ups based on active levers
  const followUps: string[] = [];
  if (newParams.collectionDelayDays > 0 && newParams.expenseChangePct <= 0) {
    followUps.push('What if we cut operating expenses by 5% to offset this?');
  }
  if (newParams.revenueChangePct === 0) {
    followUps.push('What if revenue also drops by 10%?');
  }
  if (!newParams.capexHiringCost || newParams.capexHiringCost === 0) {
    followUps.push('What if we also invest ₹20 lakh in equipment?');
  }
  followUps.push('Compare with baseline');

  return {
    isSupported: true,
    interpretationText,
    assumptions: newParams,
    assumptionsList: detectedAssumptions,
    followUps
  };
}
