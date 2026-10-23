export type Cents = number;
export type TxKind = 'in' | 'out' | 'transfer';
export type StageId = 'garagem' | 'pre-seed' | 'seed' | 'serie-a' | 'unicornio';
export type ScenarioId = 'pessimista' | 'provavel' | 'otimista';
export type Light = 'verde' | 'amarelo' | 'vermelho';
export type Confidence = 'baixa' | 'media' | 'alta';

export interface Tx {
  /** YYYY-MM-DD */
  occurredOn: string;
  kind: TxKind;
  amountCents: Cents;
  status: 'paid' | 'scheduled';
  /** chave de sistema da categoria, ex.: 'pro_labore' */
  category?: string | null;
  /** false = aporte, empréstimo etc. Não conta como receita. Padrão: true */
  operational?: boolean;
}

export interface EngineInput {
  txs: Tx[];
  cashCents: Cents;
  /** YYYY-MM-DD: o "hoje" do cálculo */
  asOf: string;
  /** 0.06 = 6% */
  taxRate: number;
  targetRunwayMonths: number;
  taxProvisioned: boolean;
}

export interface ScenarioResult {
  incomeCents: Cents;
  taxCents: Cents;
  netMonthlyCents: Cents;
  projected30dCents: Cents;
  /** null = o mês fecha no azul, sem consumo de caixa */
  runwayMonths: number | null;
  light: Light;
}

export interface Alert {
  code: 'runway_critical' | 'runway_low' | 'burn_above_income' | 'tax_not_provisioned' | 'low_confidence';
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface Forecast {
  confidence: Confidence;
  monthsOfData: number;
  burnCents: Cents;
  /** meses que o caixa aguenta sem nenhuma entrada; null = sem custos registrados */
  runwayNoIncomeMonths: number | null;
  scenarios: Record<ScenarioId, ScenarioResult>;
  proLaboreSugeridoCents: Cents;
  monthsInBlack: number;
  proLaboreMonths: number;
  stage: StageId;
  alerts: Alert[];
}
