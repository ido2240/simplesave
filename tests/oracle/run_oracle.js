'use strict';
/*
 * Parity oracle for the Python calculation engine (CLAUDE.md §3).
 *
 * Extracts the calculation functions VERBATIM from the reference simulator
 * (reference/סימולטור_משכנתא.html) by name + brace-matching — so this runs the
 * actual reference code, not a re-typed copy — wraps them in a minimal shim for
 * the global `state` and the UI/rate-band helpers the pure math never needs,
 * then evaluates a battery of cases read as JSON from stdin and prints the
 * results as JSON to stdout.
 *
 * Usage:  node run_oracle.js < battery.json > results.json
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', '..', 'reference', 'סימולטור_משכנתא.html');
const HTML = fs.readFileSync(HTML_PATH, 'utf8');

// Extract `function NAME(...) { ... }` verbatim via brace matching. The target
// functions contain no unbalanced braces inside strings/regex/comments (Hebrew
// strings have none; `${...}` template holes balance), so blind counting from
// the opening brace finds the correct close.
function extractFn(name) {
  const sig = 'function ' + name + '(';
  const start = HTML.indexOf(sig);
  if (start < 0) throw new Error('reference function not found: ' + name);
  // First match the parameter-list parens, so a default-value object literal
  // (e.g. `conditions={...}`) isn't mistaken for the function body.
  let pdepth = 0;
  let k = start + sig.length - 1; // index of the opening '('
  for (; k < HTML.length; k++) {
    const ch = HTML[k];
    if (ch === '(') pdepth++;
    else if (ch === ')') {
      pdepth--;
      if (pdepth === 0) { k++; break; }
    }
  }
  // Now brace-match the body starting at the first '{' after the ')'.
  let depth = 0;
  let j = HTML.indexOf('{', k);
  for (; j < HTML.length; j++) {
    const ch = HTML[j];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { j++; break; }
    }
  }
  return HTML.slice(start, j);
}

const NAMES = [
  'num', 'PMT', 'indexExpect', 'monthKey', 'monthlyIndexRate',
  'routeAnnualIndex', 'displayedAnnualIndex', 'routePurposeParts',
  'mergeSplitRouteCalcs', 'calcRoute', 'calcMix', 'defaultRiskRules',
  'routeChangePeriod', 'riskRuleForRoute', 'mixRisk', 'inferRouteKind',
  'nearestAllowedYears', 'allowedYears', 'candidateYears', 'validateMixTemplate',
  'templateConditionsForMix', 'shortenFixedRoutesToMaximum',
  'calculateMixToRange', 'applyRouteKind',
];

const SRC = NAMES.map(extractFn).join('\n\n');

// Shim: the global `state` plus no-op/stub versions of the UI, rate-band, and
// current-mortgage helpers that the pure math subset does not depend on.
const SHIM = `
let state = {
  indexCalcMode: 'annual', monthlyIndices: [], riskRules: null,
  params: {}, mixes: {}, financial: {}, mixCalcStatus: {}, __loan: 0,
};
function today() { return '2025-01-01'; }
function generalRateForRoute() { return { anchor: 0, margin: 0 }; }
function syncRouteGeneralRate() {}
function applyCurrentPurposeSplitToRoutes() {}
function applyMixSettingsToRoutes() {}
function currentMortgageBalance() { return 0; }
function mixLoanAmount() { return state.__loan || 0; }
function activeClockTemplates() { return {}; }
function fmtMoney(n) { return String(n); }
`;

const factory = new Function(
  SHIM + '\n' + SRC + '\n' +
  'return { calcRoute, calcMix, mixRisk, calculateMixToRange, num,' +
  ' setState: (s) => { state = s; }, getState: () => state };'
);
const M = factory();

// Coerce a sparse/undefined-holed numeric array to a dense [0..n] of numbers.
function densify(arr, n) {
  const out = [];
  for (let i = 0; i <= n; i++) out.push(+((arr && arr[i]) || 0));
  return out;
}

function routeResult(route, params) {
  const c = M.calcRoute(route, params);
  return {
    S: c.S, T: c.T, n: c.n,
    annualRate: c.annualRate, enteredAnnualRate: c.enteredAnnualRate,
    effRate: c.effRate, annualIndex: c.annualIndex,
    invalidNegativeRate: !!c.invalidNegativeRate,
    L: densify(c.L, c.n), M: densify(c.M, c.n),
    prin: densify(c.prin, c.n), intr: densify(c.intr, c.n),
    cum: densify(c.cum, c.n), baseL: densify(c.baseL, c.n),
    basePrin: densify(c.basePrin, c.n), indexBal: densify(c.indexBal, c.n),
    idxPrin: densify(c.idxPrin, c.n), idxIntr: densify(c.idxIntr, c.n),
    idxEff: densify(c.idxEff, c.n),
  };
}

function mixResult(c) {
  return {
    E: c.E, exitFee: c.exitFee, totalAmount: c.totalAmount, principal: c.principal,
    avgYears: c.avgYears, avgRate: c.avgRate, firstPay: c.firstPay, total: c.total,
    interest: c.interest, indexation: c.indexation, maxN: c.maxN,
  };
}

function runCase(testCase) {
  const params = testCase.params || {};
  if (testCase.type === 'route') {
    return { route: routeResult(testCase.routes[0], params) };
  }
  if (testCase.type === 'mix') {
    return { mix: mixResult(M.calcMix(testCase.routes, params)) };
  }
  if (testCase.type === 'risk') {
    const r = M.mixRisk(testCase.routes);
    return { risk: { score: r.score, level: r.level === undefined ? 0 : r.level, label: r.label } };
  }
  if (testCase.type === 'tune') {
    // Build the state the verbatim calculateMixToRange reads, then run it.
    const routes = JSON.parse(JSON.stringify(testCase.routes));
    M.setState({
      indexCalcMode: 'annual', monthlyIndices: [], riskRules: null,
      params, mixes: { t1: routes }, mixCalcStatus: {}, __loan: testCase.loan,
      financial: { minPay: testCase.minPay, maxPayDesired: testCase.maxPay, loanAmount: testCase.loan },
    });
    const ok = M.calculateMixToRange('t1');
    const tuned = M.getState().mixes.t1;
    return {
      tune: {
        ok: !!ok,
        years: tuned.map((r) => M.num(r.years)),
        mix: mixResult(M.calcMix(tuned, params)),
      },
    };
  }
  throw new Error('unknown case type: ' + testCase.type);
}

const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const results = input.cases.map(runCase);
process.stdout.write(JSON.stringify({ results }));
