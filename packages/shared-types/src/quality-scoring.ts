// ============================================================
// Quality Gates — Scoring Engine
// Pure functions, zero dependencies. Usable from API + MCP.
// Follows Forgewright 4-dimension model:
//   Build (25) + Regression (25) + Standards (25) + Traceability (25) = 100
// ============================================================

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F'

export type GradeThresholds = {
  A: number // default 90
  B: number // default 80
  C: number // default 70
  D: number // default 60
}

export const DEFAULT_THRESHOLDS: GradeThresholds = {
  A: 90,
  B: 80,
  C: 70,
  D: 60,
}

export type QualityDimensions = {
  build: number // 0-25
  regression: number // 0-25
  standards: number // 0-25
  traceability: number // 0-25
}

/** Raw verification results from build/test/lint pipeline */
export type VerificationResults = {
  // Level 1 — Build (all-or-nothing, 25 pts)
  buildPassed: boolean
  typecheckPassed: boolean
  lintPassed: boolean

  // Level 2 — Regression (all-or-nothing, 25 pts)
  testsPassed?: boolean
  testsBaseline?: number
  testsCurrent?: number
  isGreenfield?: boolean

  // Level 3 — Standards (proportional, 25 pts)
  stubsFound?: number // TODO, FIXME, HACK, XXX count
  secretsFound?: number // hardcoded secrets detected
  lintErrorCount?: number
  lintWarningCount?: number

  // Level 4 — Traceability (proportional, 25 pts)
  requirementsMapped?: number
  requirementsTotal?: number
  hasTests?: boolean
  hasDocs?: boolean
}

export type QualityScoreResult = {
  dimensions: QualityDimensions
  total: number
  grade: Grade
  passed: boolean
  summary: string
}

// ── Dimension Calculators ──

/**
 * Level 1 — Build (0 or 25)
 * All-or-nothing: build + typecheck + lint must ALL pass.
 */
export function calculateBuildScore(results: Pick<VerificationResults, 'buildPassed' | 'typecheckPassed' | 'lintPassed'>): number {
  return (results.buildPassed && results.typecheckPassed && results.lintPassed) ? 25 : 0
}

/**
 * Level 2 — Regression (0 or 25)
 * Greenfield projects auto-grant 25.
 * Brownfield: existing tests must stay passing, count must not decrease.
 */
export function calculateRegressionScore(results: Pick<VerificationResults, 'testsPassed' | 'testsBaseline' | 'testsCurrent' | 'isGreenfield'>): number {
  if (results.isGreenfield) return 25
  if (results.testsPassed === undefined) return 25 // no test info = assume passing
  if (!results.testsPassed) return 0
  if (results.testsBaseline !== undefined && results.testsCurrent !== undefined) {
    return results.testsCurrent >= results.testsBaseline ? 25 : 0
  }
  return results.testsPassed ? 25 : 0
}

/**
 * Level 3 — Standards (0-25, proportional)
 * - No stubs (TODO/FIXME/HACK/XXX): 10 pts (binary)
 * - No hardcoded secrets: 10 pts (binary)
 * - Lint cleanliness: 5 pts (proportional — 0 errors = 5, >10 errors = 0)
 */
export function calculateStandardsScore(results: Pick<VerificationResults, 'stubsFound' | 'secretsFound' | 'lintErrorCount' | 'lintWarningCount'>): number {
  let score = 0

  // No stubs: 10 pts
  const stubs = results.stubsFound ?? 0
  score += stubs === 0 ? 10 : 0

  // No secrets: 10 pts
  const secrets = results.secretsFound ?? 0
  score += secrets === 0 ? 10 : 0

  // Lint cleanliness: 5 pts proportional
  const errors = results.lintErrorCount ?? 0
  if (errors === 0) {
    score += 5
  } else if (errors <= 10) {
    score += Math.round(5 * (1 - errors / 10))
  }
  // >10 errors = 0 pts

  return score
}

/**
 * Level 4 — Traceability (0-25, proportional)
 * - Requirements mapped: 15 pts (proportional)
 * - Has tests for new code: 5 pts (binary)
 * - Has documentation artifacts: 5 pts (binary)
 */
export function calculateTraceabilityScore(results: Pick<VerificationResults, 'requirementsMapped' | 'requirementsTotal' | 'hasTests' | 'hasDocs'>): number {
  let score = 0

  // Requirements mapping: 15 pts proportional
  if (results.requirementsTotal && results.requirementsTotal > 0) {
    const mapped = results.requirementsMapped ?? 0
    score += Math.round(15 * (mapped / results.requirementsTotal))
  } else {
    // No requirements defined = full marks (not penalized)
    score += 15
  }

  // Has tests: 5 pts
  score += (results.hasTests ?? false) ? 5 : 0

  // Has docs: 5 pts
  score += (results.hasDocs ?? false) ? 5 : 0

  return score
}

// ── Grade Calculator ──

/** Convert total score (0-100) to letter grade */
export function scoreToGrade(score: number, thresholds: GradeThresholds = DEFAULT_THRESHOLDS): Grade {
  if (score >= thresholds.A) return 'A'
  if (score >= thresholds.B) return 'B'
  if (score >= thresholds.C) return 'C'
  if (score >= thresholds.D) return 'D'
  return 'F'
}

/** Get grade display color (CSS variable name) */
export function gradeColor(grade: Grade): string {
  const colors: Record<Grade, string> = {
    A: '#22c55e', // green
    B: '#3b82f6', // blue
    C: '#eab308', // yellow
    D: '#f97316', // orange
    F: '#ef4444', // red
  }
  return colors[grade]
}

/** Grade action description */
export function gradeAction(grade: Grade): string {
  const actions: Record<Grade, string> = {
    A: 'Proceed immediately',
    B: 'Proceed with minor warnings',
    C: 'Proceed but flag at next gate',
    D: 'Pause — show report, ask user',
    F: 'Stop — must remediate before proceeding',
  }
  return actions[grade]
}

// ── Main Calculator ──

/** Calculate full quality score from raw verification results */
export function calculateFromVerificationResults(results: VerificationResults): QualityScoreResult {
  const dimensions: QualityDimensions = {
    build: calculateBuildScore(results),
    regression: calculateRegressionScore(results),
    standards: calculateStandardsScore(results),
    traceability: calculateTraceabilityScore(results),
  }

  const total = dimensions.build + dimensions.regression + dimensions.standards + dimensions.traceability
  const grade = scoreToGrade(total)
  const passed = grade !== 'F'

  const summary = [
    `Build: ${dimensions.build}/25`,
    `Regression: ${dimensions.regression}/25`,
    `Standards: ${dimensions.standards}/25`,
    `Traceability: ${dimensions.traceability}/25`,
    `Total: ${total}/100 (${grade})`,
    passed ? 'PASSED' : 'FAILED',
  ].join(' | ')

  return { dimensions, total, grade, passed, summary }
}

/** Reconstruct approximate dimensions from a legacy single score (0-100) */
export function approximateDimensionsFromTotal(total: number): QualityDimensions {
  // Distribute proportionally across 4 equal dimensions
  const perDimension = Math.round(total / 4)
  const capped = Math.min(perDimension, 25)
  return {
    build: capped,
    regression: capped,
    standards: capped,
    traceability: Math.min(total - capped * 3, 25),
  }
}
