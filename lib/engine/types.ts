// Engine data model — a faithful port of src/simplesave/engine/types.py.
// Enum *values* are the exact Hebrew literals from the reference simulator, so
// the data is byte-identical and the risk table still matches.

export type Board = "שפיצר" | "קרן שווה"; // Spitzer (level payment) | equal principal
export type Balloon = "" | "בלון מלא" | "בלון חלקי" | "גרייס מלא" | "גרייס חלקי";
export type RateType = "" | "קבועה" | "משתנה";
export type IndexType = "" | "ללא" | "מדד" | "דולר" | "אירו";
export type AnchorType = "" | "פריים" | 'פק"מ' | 'אג"ח';
export type RouteKind = "fixed" | "variable" | "prime";

export interface PurposeSplit {
  housing: number;
  allPurpose: number;
}

export interface MarketParams {
  cpi: number; // expected annual CPI index
  usd: number; // expected annual USD rate
  eur: number; // expected annual EUR rate
}

/** A single mortgage track. Defaults mirror the reference blankRoute. */
export interface Route {
  amount: number;
  years: number;
  anchor: number;
  margin: number;
  board: Board;
  balloon: Balloon;
  balloonMonths: number;
  indexType: IndexType;
  indexPct: number;
  dailyInterest: boolean;
  customAnnualIndex: number | null;
  kind: RouteKind | null;
  rateType: RateType;
  anchorType: AnchorType;
  changeMonths: number;
  sharePct: number;
  exitFee: number;
  yearStep: number;
  purposeSplit: PurposeSplit | null;
  loanPurpose: string;
}

/** Per-route amortization output. Per-month arrays are 1-indexed (index 0 = 0). */
export interface RouteResult {
  S: number; // first payment
  T: number; // total relevant cost
  n: number; // months
  annualRate: number;
  enteredAnnualRate: number;
  invalidNegativeRate: boolean;
  effRate: number;
  annualIndex: number;
  L: number[]; // opening (linked) balance
  baseL: number[];
  basePrin: number[];
  indexBal: number[];
  M: number[]; // monthly payment
  prin: number[];
  intr: number[];
  idxEff: number[];
  idxPrin: number[];
  idxIntr: number[];
  cum: number[];
}

export interface MixResult {
  E: number; // total principal
  exitFee: number;
  totalAmount: number;
  principal: number;
  avgYears: number;
  avgRate: number;
  firstPay: number;
  total: number;
  interest: number;
  indexation: number;
  per: RouteResult[];
  maxN: number;
}

export interface RiskResult {
  score: number;
  level: number;
  label: string;
}

export interface RiskRule {
  routeKind: string; // 'fixed' | 'variable' | 'prime' | 'all'
  fromMonths: number;
  toMonths: number;
  indexed: string; // engine values 'כן' | 'לא' | 'הכול' (yes | no | all)
  exitPenalty: string;
  risk: number;
}

export interface TuneConditions {
  shortenFixed: boolean;
  linkedFixedFirst: boolean;
}

export const DEFAULT_CONDITIONS: TuneConditions = { shortenFixed: true, linkedFixedFirst: true };

export interface ShortenInfo {
  index: number;
  fromYears: number;
  toYears: number;
  linked: boolean;
}

export interface TuneResult {
  ok: boolean;
  inRange: boolean;
  reason: string;
  routes: Route[];
  years: number[];
  mix: MixResult | null;
  shortened: ShortenInfo[];
}

/** Factory mirroring the reference blankRoute / Route dataclass defaults. */
export function blankRoute(partial: Partial<Route> = {}): Route {
  return {
    amount: 0,
    years: 20,
    anchor: 0,
    margin: 0,
    board: "שפיצר",
    balloon: "",
    balloonMonths: 0,
    indexType: "ללא",
    indexPct: 1,
    dailyInterest: false,
    customAnnualIndex: null,
    kind: null,
    rateType: "קבועה",
    anchorType: "",
    changeMonths: 0,
    sharePct: 0,
    exitFee: 0,
    yearStep: 0,
    purposeSplit: null,
    loanPurpose: "",
    ...partial,
  };
}
