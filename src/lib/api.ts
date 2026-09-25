import { AnomalyRecord, DepartmentBudget, CashForecastPoint, FinvoraRecommendation } from '../types';

const API_BASE = 'http://127.0.0.1:8000/api';

export interface DashboardSummaryResponse {
  total_balance: number;
  monthly_inflow: number;
  monthly_outflow: number;
  open_risk_count: number;
  budget_health_pct: number;
}

export interface ForecastApiResponse {
  points: CashForecastPoint[];
  dates: string[];
  predicted: number[];
  baseline: number[];
  scenario_label?: string;
}

export interface SimulationAdjustment {
  type: string; // 'delay_payment' | 'add_expense'
  vendor_id?: number;
  amount?: number;
  days?: number;
}

export interface RiskActionResponse {
  id: number | string;
  status: string;
  risk_type?: string;
  score?: number;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`API Error [${res.status}] ${res.statusText}: ${errorText}`);
  }

  return res.json() as Promise<T>;
}

/**
 * 1. Dashboard Summary KPI fetch
 */
export async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  return request<DashboardSummaryResponse>('/dashboard/summary');
}

/**
 * 2. Risk Alerts list
 */
export async function fetchRiskAlerts(status?: string): Promise<AnomalyRecord[]> {
  const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '?status=all';
  const data = await request<AnomalyRecord[]>(`/risks${query}`);
  // Normalize string ID if numeric
  return data.map(item => ({
    ...item,
    id: String(item.id),
  }));
}

/**
 * 3. Risk Alert detail
 */
export async function fetchRiskDetail(id: number | string): Promise<AnomalyRecord> {
  const data = await request<AnomalyRecord>(`/risks/${id}`);
  return {
    ...data,
    id: String(data.id),
  };
}

/**
 * 4. Risk Action (approve, dismiss, hold, etc.)
 */
export async function takeRiskAction(
  id: number | string,
  action: string,
  note?: string,
  dismissReason?: string
): Promise<RiskActionResponse> {
  return request<RiskActionResponse>(`/risks/${id}/action`, {
    method: 'POST',
    body: JSON.stringify({ action, note, dismissReason }),
  });
}

/**
 * 5. Cash Forecast
 */
export async function fetchCashForecast(horizon: number = 30): Promise<ForecastApiResponse> {
  return request<ForecastApiResponse>(`/forecast?horizon=${horizon}`);
}

/**
 * 6. Scenario Simulation
 */
export async function simulateScenario(
  adjustments: SimulationAdjustment[],
  horizon: number = 30
): Promise<ForecastApiResponse> {
  return request<ForecastApiResponse>('/simulate', {
    method: 'POST',
    body: JSON.stringify({ adjustments, horizon }),
  });
}

/**
 * 7. Department Budgets
 */
export async function fetchDepartmentBudgets(): Promise<DepartmentBudget[]> {
  return request<DepartmentBudget[]>('/budget');
}

/**
 * 8. Copilot AI Chat
 */
export interface CopilotChatApiResponse {
  reply: string;
  kpis: {
    accuracy: number;
    feasibility: number;
    impact?: string;
    feasibilityNote?: string;
    auditConfidence?: 'High' | 'Very High' | 'Verified';
  };
  citations?: {
    type: 'invoice' | 'vendor' | 'department' | 'risk';
    title: string;
    referenceId: string;
  }[];
  suggestedActions?: {
    label: string;
    actionType: 'navigate' | 'open_modal' | 'draft_proposal' | 'filter';
    payload: string;
  }[];
}

export async function sendCopilotChat(message: string): Promise<CopilotChatApiResponse> {
  return request<CopilotChatApiResponse>('/copilot/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function fetchScenarioRecommendation(
  query: string,
  scenarioParams?: Record<string, any>,
  simulationResult?: Record<string, any>
): Promise<FinvoraRecommendation> {
  return request<FinvoraRecommendation>('/copilot/scenario-recommendation', {
    method: 'POST',
    body: JSON.stringify({
      query,
      scenario_params: scenarioParams,
      simulation_result: simulationResult,
    }),
  });
}

