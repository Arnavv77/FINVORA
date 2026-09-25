# FINVORA — AI Financial Intelligence & Decision Support Platform

> **Positioning:** Finance Copilot + Predictive Intelligence = FINVORA  
> **Tagline:** Built for Modern Enterprise Finance Teams  
> **Currency & Geography:** Indian Enterprise Ledger (INR ₹, GSTIN compliance, Lakhs & Crores)

FINVORA is an enterprise financial intelligence and autonomous decision support system designed for CFOs, finance controllers, and accounts teams. It unifies accounting, ERP, banking telemetry, and payment rails into a single predictive cockpit with continuous risk detection, cash-flow forecasting, dynamic budget governance, and explainable human-in-the-loop approval workflows.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js `v18+` (Tested on Node `v24.14.1` with npm `11.11.0`)
- Modern web browser (Chrome, Edge, Firefox, Safari)

### 2. Run the Demo
```bash
# Clone or open the project folder
cd FINVORA

# Install dependencies (if not already installed)
npm install

# Start local development server
npm run dev
```

Visit **`http://localhost:5173/`** in your browser. No backend setup, cloud configuration, or external API keys are required.

---

## 🏛️ Application Architecture & Modules

FINVORA is structured into 7 core intelligence modules plus an executive cockpit, connected by a unified, typed reactive mock service layer:

```
src/
├── types/                 # TypeScript data contracts (Invoices, Anomalies, Forecasts, Budgets)
├── data/                  # Realistic connected Indian enterprise dataset (Aethelgard Enterprise)
├── utils/                 # Indian Rupee (₹ Lakhs/Crores), date, percent, and CSV export helpers
├── context/               # FinancialContext (shared reactive state, local persistence, simulation)
├── components/
│   ├── layout/            # AppShell, Persistent Sidebar, TopBar, CopilotDrawer
│   └── common/            # KPICard, ChartCard, StatusBadge, Drawer, Modal, ConfirmDialog, Toasts
└── pages/
    ├── OverviewPage.tsx              # Executive Liquidity & Attention Dashboard
    ├── FinancialDataPage.tsx         # Module 1: Data Intelligence & CSV Ingestion
    ├── RiskAnomaliesPage.tsx         # Module 2: Risk & Anomaly Register
    ├── CashFlowPage.tsx              # Module 3: 30/60/90-Day Cash Forecast & Aging
    ├── APExpensesPage.tsx            # Module 4: AP & Explainable Prioritization
    ├── BudgetIntelligencePage.tsx    # Module 5: Dynamic Budget & Reallocations
    ├── WhatIfSimulatorPage.tsx       # Module 6: Deterministic Scenario Simulator
    ├── DecisionsApprovalsPage.tsx    # Module 7: Explainable Decisions & Workflow Rules
    ├── DataConnectionsPage.tsx       # Integrated Banking & ERP Connectors
    └── SettingsPage.tsx              # AI Risk Sensitivities & Demo Reset
```

---

## 🎯 The Connected Hackathon Demo Story

FINVORA is built around a coherent, mathematically consistent demonstration story that connects all 7 modules:

1. **Detection in Module 2 (`/risk-anomalies`)**:
   - The AI Anomaly Engine flags a **Critical Duplicate Invoice** (`ANOM-2024-001`).
   - `INV-2024-8849` from *Zenith Cloud Services Pvt Ltd* for **₹6,80,000** matches cleared invoice `INV-2024-8841` (identical GSTIN, line items, and beneficiary bank account).
2. **Investigation**:
   - The user opens the side drawer, reviews correlated evidence with 97.4% confidence score, and clicks **"Propose Payment Hold"**.
3. **Governance & Dual-Role Sign-off in Module 7 (`/decisions-approvals`)**:
   - A formal proposal (`PROP-2024-001`) is drafted: `Draft → Pending Approval`.
   - The **Demo Role Switcher** in the top bar allows toggling between **Finance Analyst** and **Finance Manager**.
   - As Finance Manager, the user approves the proposal: `Pending Approval → Approved`.
4. **Explicit Execution**:
   - The user clicks **"Execute Decision Directive"** and confirms in the dialog.
   - The directive is executed across the entire enterprise ledger:
     - Invoice status transitions to **"On Hold"** in Module 4 (AP & Expenses).
     - The scheduled payment run suppresses the ₹6,80,000 disbursement.
     - Cash-Flow Forecast (Module 3) recalculates immediately, saving ₹6,80,000 and averting the projected liquidity trough.
     - Anomaly status updates to **"Payment Held"** with an immutable audit log.
5. **Dynamic Budget Intelligence (Module 5)**:
   - Detects **Marketing & Growth** +18% overspend (`ANOM-2024-003`).
   - User reallocates ₹4,50,000 surplus from Engineering to balance the ledger with zero net enterprise variance.
6. **What-If Simulation (Module 6)**:
   - Interactive sliders stress-test a 15-day collection delay or ±20% revenue change with real-time recalculations.
7. **Contextual AI Copilot ("Ask FINVORA")**:
   - Clickable throughout the app; answers questions about cash balance declines, invoice reviews, and budget variance with linked citations.

---

## 🎨 Design & Aesthetic Foundations

- **Palette**: Warm Dark Theme (`#111110` background, `#171614` sidebar, `#1D1C19` cards, `#F4F1EB` text, `#F59E0B` amber accents).
- **Surfaces**: Restrained liquid-glass surfaces (`backdrop-blur-md`, `border-white/[0.08]`).
- **Typography**: Plus Jakarta Sans for UI headings and JetBrains Mono for financial figures with `tabular-nums`.
- **Formatting**: Indian Rupee (`₹6,80,000`, `₹1.82 Cr`), GSTIN numbers, and standard fiscal terms (Net-15, Net-30).

---

## 🛡️ Production Simulation vs. Real Backend Readiness

- **Current State (Hackathon Demo)**:
  - Mock service layer with reactive state stored in `localStorage`.
  - Deterministic client-side financial forecasting and simulation engines.
  - CSV upload with live client-side parsing, column mapping, and ledger ingestion.
  - Reset Demo Data button anytime in the top bar or settings.
- **FastAPI / Production Migration**:
  - All data interfaces are strongly typed in `src/types/index.ts`.
  - Replacing `src/context/FinancialContext.tsx` actions with `fetch()` calls to a FastAPI backend is straightforward and requires zero component refactoring.
