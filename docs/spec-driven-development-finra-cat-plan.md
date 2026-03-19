# Spec-Driven Development — FINRA CAT executionQuantity Precision Change
## A Detailed Industry Plan for Brownfield & Greenfield Projects

**Author:** Manoj Kumar
**Date:** 2026-03-19
**Status:** Reference Architecture
**Applies to:** Any regulated, event-driven brownfield system with shared domain fields

---

## Table of Contents

1. [Spec-Driven Development Tools — How Claude Code Fits](#1-spec-driven-development-tools)
2. [Greenfield vs Brownfield Strategy](#2-greenfield-vs-brownfield-strategy)
3. [The Industry Workflow](#3-the-industry-workflow)
4. [Deep Dive — FINRA CAT executionQuantity Precision Change](#4-deep-dive--finra-cat-executionquantity-precision-change)
   - [Phase 0: The Spec (RFC)](#phase-0--the-spec-rfc)
   - [Phase 1: Jira Stories](#phase-1--jira-stories)
   - [Phase 2: Tests First (Red)](#phase-2--tests-first-red)
   - [Phase 3: Implementation — Strangler Fig](#phase-3--implementation--strangler-fig)
   - [Phase 4: Commit Gates](#phase-4--commit-gates)
   - [Phase 5: Release — Canary Pattern](#phase-5--release--canary-pattern)
5. [Industry Paths Compared](#5-industry-paths-compared)
6. [Recommended Path for FINRA CAT](#6-recommended-path-for-finra-cat)
7. [Claude Code Integration](#7-claude-code-integration)

---

## 1. Spec-Driven Development Tools

### Tool Comparison

| Tool | Model | Best For | Claude Code Integration |
|---|---|---|---|
| **Kiro** (Amazon, 2025) | Specs = requirements + design + tasks in `.kiro/` folder | Greenfield — spec generates stories, tests, code in one shot | Read Kiro spec files as CLAUDE.md context; subagents per spec section |
| **OpenSpec** | Machine-readable API/data contracts (OpenAPI lineage) | API-first, brownfield API evolution | Generate from spec; validate against it in CI |
| **Spec.it** | BDD-style plain-English specs → executable scenarios | Business rule-heavy domains (compliance, finance) | Convert Spec.it scenarios directly to Vitest/Cucumber test fixtures |

### Claude Code's Position

Claude Code is **spec-tool agnostic** — it reads whatever spec format you give it before writing a line of code.

```
Spec file (any format)
  → CLAUDE.md or task file references it
    → Claude reads spec before touching code
      → Claude writes code to satisfy spec
        → Claude writes tests that assert spec compliance
```

The **Kiro model** is closest to the pattern used by this repo (`.claude/agents/`, `tasks/`, `CLAUDE.md`) — specs become the source of truth, not conversations.

---

## 2. Greenfield vs Brownfield Strategy

### Greenfield (new project)

```
PRD (human)
  → Kiro / OpenSpec generates machine spec
    → Claude Code reads spec → CLAUDE.md → task files → agents → loop
      → All code, tests, and ADRs generated spec-first
        → Jira auto-populated from tasks (via MCP)
          → CI validates every commit against spec
```

**Key principle:** The spec IS the source of truth. Code is a derivative.

### Brownfield (FINRA CAT case)

The spec doesn't exist yet — you must **reverse-engineer it from the running system** before making any change:

```
Running system
  → Spec extraction (document what IS — as-is spec)
    → Impact analysis (what changes — blast radius)
      → Change spec (what WILL BE — to-be spec)
        → Jira stories from the delta
          → Business rule tests written (red)
            → Implementation (green)
              → Regression suite
                → Release gate
```

**Critical difference from greenfield:** Write the "as-is" spec first, before touching the change. The change spec is the delta only. This is the pattern Amazon uses for service migrations.

---

## 3. The Industry Workflow

### Spec → Jira → Business Change → Test → Commit → Release

This maps to the **RFC → Ticket → Branch → PR → Gate → Deploy** pattern used at Amazon, Google, and Stripe.

```
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 0: SPEC (before any code)                                    │
│  RFC / Design Doc / Kiro Spec                                       │
│  • What is changing and WHY                                         │
│  • Data contract diff (before/after)                                │
│  • Blast radius (which systems, which rules)                        │
│  • Rollback plan                                                    │
│  → Reviewed + approved by domain owner + compliance                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│  PHASE 1: JIRA STORIES (spec → tickets)                             │
│  Epic: executionQuantity precision change                           │
│  Story 1: Schema migration (DB + Avro/Protobuf schema)              │
│  Story 2: Business rule updates (all FINRA CAT enrichments)         │
│  Story 3: Validation rule updates (threshold checks)                │
│  Story 4: Downstream consumer contracts                             │
│  Story 5: Test data fixtures                                        │
│  Story 6: Release + rollback runbook                                │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│  PHASE 2: TESTS FIRST (red)                                         │
│  • Contract tests: new schema accepted, old schema rejected         │
│  • Business rule tests: quantity precision in all enrichments       │
│  • Boundary tests: min/max precision edge cases                     │
│  • Regression: existing CAT report output unchanged (except qty)    │
│  All tests FAIL — this is correct and expected                      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│  PHASE 3: IMPLEMENTATION (green)                                    │
│  • Schema change (backward-compatible via Avro evolution)           │
│  • Business rule updates one enrichment at a time                   │
│  • Feature flag: old precision / new precision toggle per service   │
│  Tests go green incrementally                                       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│  PHASE 4: COMMIT GATES                                              │
│  • type-check + lint (no floating-point arithmetic)                 │
│  • Unit tests (≥ 90% coverage on changed enrichments)              │
│  • Contract tests (Pact / schema registry validation)               │
│  • Compliance assertion: CAT report conforms to FINRA XSD           │
│  PR blocked until all gates are green                               │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│  PHASE 5: RELEASE                                                   │
│  • Feature flag ON in staging → full regression + FINRA dry-run     │
│  • Canary: 1–5% of CAT reports with new precision                   │
│  • Monitor: FINRA rejection rate, downstream reconciliation         │
│  • Full rollout: flag removed, old code path deleted                │
│  • Rollback: flip flag — schema is backward-compatible              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Deep Dive — FINRA CAT `executionQuantity` Precision Change

### The Problem

```
Before: executionQuantity: Long  (integer — whole shares only)
After:  executionQuantity: Decimal(18, 8)  (fractional shares, crypto, ADRs)

Impact:
  • Schema       : Avro/Protobuf field type change
  • Storage      : DB column type change (BIGINT → NUMERIC(18,8))
  • Business rules: every rule that compares, aggregates, or thresholds qty
  • Downstream   : FINRA submission format, position systems, risk engines
  • Regulatory   : FINRA CAT Rule 613 specifies accepted precision formats
```

### Enrichments Using executionQuantity (Blast Radius)

| Enrichment | What It Does | Impact of Precision Change |
|---|---|---|
| `QuantityValidationEnrichment` | Bounds check: qty > 0, qty ≤ MAX | Must accept sub-unit values |
| `FeeCalculationEnrichment` | fee = qty × rate | Must use BigDecimal, not float |
| `PositionAggregationEnrichment` | Net position = Σ(buys) − Σ(sells) | Fractional netting |
| `DuplicateDetectionEnrichment` | Dedup key includes qty | Scale-aware comparison |
| `CatSubmissionFormatter` | FINRA wire message serialisation | 8dp string format required |

---

### Phase 0 — The Spec (RFC)

> Write this document before any Jira ticket is created.
> At Amazon this is a PRFAQ. At Google it is a Design Doc. At Stripe it is an RFC PR.

```markdown
# RFC: executionQuantity Precision Extension — FINRA CAT

## Problem
executionQuantity is currently typed as Long (integer shares).
Fractional share trading and crypto-denominated instruments require
sub-unit precision. FINRA CAT v3.2 spec permits Decimal(18,8) for
equity and Decimal(18,12) for digital assets.

## Proposed Change
- Schema  : executionQuantity: Decimal(18,8) — equity first; crypto in v2
- Wire    : Avro logical type `decimal` (bytes, precision=18, scale=8)
- DB      : NUMERIC(18,8) — no existing data loss (Long fits in 18 digits)
- API     : BigDecimal in Java / Decimal in Python / string in JSON
            (never use float or double — avoid IEEE 754 drift)

## Blast Radius
Enrichments that read executionQuantity:
  1. QuantityValidationEnrichment  — threshold checks (> 0, ≤ MAX_SHARES)
  2. FeeCalculationEnrichment      — fee = qty × rate (was integer math)
  3. PositionAggregationEnrichment — net position summing
  4. DuplicateDetectionEnrichment  — uses qty as part of dedup key
  5. CatSubmissionFormatter        — formats qty for FINRA wire message

## Backward Compatibility Strategy
- Old messages with Long qty  : coerce to Decimal(qty.toDecimal(), scale=8)
- New messages with Decimal qty: pass through unchanged
- Schema registry              : BACKWARD_TRANSITIVE compatibility level
- Feature flag                 : CAT_QUANTITY_PRECISION_ENABLED (default OFF)

## Data Contract — Before / After

| Field              | Before          | After                |
|--------------------|-----------------|----------------------|
| executionQuantity  | long            | decimal(18,8)        |
| Wire format        | Avro long       | Avro bytes (decimal) |
| JSON representation| 100             | "100.50000000"       |
| DB column          | BIGINT          | NUMERIC(18,8)        |
| Min value          | 1               | 0.00000001           |
| Max value          | 9,999,999,999   | 999,999,999.99999999 |

## Rollback Plan
- Flip feature flag to OFF: all enrichments use Long path immediately
- Schema is backward compatible — no data migration required
- CAT submissions revert to integer precision until flag re-enabled
- Estimated MTTR: < 2 minutes (flag flip, no deployment)

## Compliance Sign-off Required
- FINRA CAT Rule 613 field format approval
- Legal / compliance review of precision representation
- RegTech team dry-run submission with sample Decimal qty messages
- Risk sign-off: no P&L impact from rounding in fee calculation
```

---

### Phase 1 — Jira Stories

Generated from the RFC delta. One story per enrichment + cross-cutting concerns.

```
Epic: [CAT-100] executionQuantity precision — Decimal(18,8) support

┌─ Foundation (no business logic — do first) ──────────────────────────┐
│ [CAT-101] Avro schema evolution: executionQuantity Long → Decimal(18,8)
│   AC: schema registry accepts new schema at BACKWARD_TRANSITIVE level
│   AC: old Long messages deserialize correctly via coercion
│   AC: schema diff documented and reviewed by domain owner
│
│ [CAT-102] DB migration: execution_quantity BIGINT → NUMERIC(18,8)
│   AC: migration runs in < 2 min on production row count
│   AC: existing rows preserved with scale=0 (e.g., 100 → 100.00000000)
│   AC: rollback migration tested and documented
└──────────────────────────────────────────────────────────────────────┘

┌─ Enrichment updates (one story per enrichment) ──────────────────────┐
│ [CAT-103] QuantityValidationEnrichment — precision-aware bounds check
│   AC: qty=0.00000001 passes validation
│   AC: qty=999999999.99999999 passes validation
│   AC: qty=-0.00000001 fails validation
│   AC: existing integer quantity tests still pass (backward compat)
│
│ [CAT-104] FeeCalculationEnrichment — BigDecimal arithmetic (no float)
│   AC: fee = 100.5 × 0.0025 = 0.25125000 (not 0.25125000000000003)
│   AC: no floating-point (double/float) used anywhere in fee path
│   AC: rounding mode: HALF_EVEN (banker's rounding for regulatory)
│
│ [CAT-105] PositionAggregationEnrichment — fractional position netting
│   AC: net position of 100.5 + 50.25 − 75.1 = 75.65 (exact)
│   AC: aggregated positions stored as NUMERIC(18,8) in DB
│
│ [CAT-106] DuplicateDetectionEnrichment — scale-aware dedup key
│   AC: qty=100 and qty=100.0 from different sources are treated correctly
│   AC: qty=100.00000000 and qty=100.00000000 are flagged as duplicate
│   AC: dedup key hashing documented for compliance audit trail
│
│ [CAT-107] CatSubmissionFormatter — FINRA wire format 8dp
│   AC: FINRA-accepted format: executionQty="100.50000000"
│   AC: backward compat: integer qty formatted as "100.00000000"
│   AC: FINRA dry-run submission passes in staging
└──────────────────────────────────────────────────────────────────────┘

┌─ Release infrastructure ─────────────────────────────────────────────┐
│ [CAT-108] Feature flag wiring + per-enrichment toggle
│   AC: CAT_QUANTITY_PRECISION_ENABLED flag controls all enrichments
│   AC: flag flip takes effect within 30 seconds (no restart needed)
│
│ [CAT-109] Performance test: Decimal arithmetic vs Long (< 5% overhead)
│   AC: p99 enrichment latency with Decimal within 5% of Long baseline
│
│ [CAT-110] Rollback runbook + compliance sign-off checklist
│   AC: runbook tested in staging (flag flip → verify Long path active)
│   AC: compliance sign-off documented and attached to epic
└──────────────────────────────────────────────────────────────────────┘
```

---

### Phase 2 — Tests First (Red)

Write all tests before writing implementation code. All tests fail — that is the correct starting state.

```typescript
// CAT-103: QuantityValidationEnrichment
describe('QuantityValidationEnrichment — Decimal precision', () => {
  it('accepts minimum fractional quantity (1e-8)', () => {
    expect(validate(new Decimal('0.00000001'))).toBe(VALID);
  });
  it('accepts maximum quantity (999999999.99999999)', () => {
    expect(validate(new Decimal('999999999.99999999'))).toBe(VALID);
  });
  it('rejects negative fractional quantity', () => {
    expect(validate(new Decimal('-0.00000001'))).toBe(INVALID);
  });
  it('rejects zero', () => {
    expect(validate(new Decimal('0'))).toBe(INVALID);
  });
  it('accepts legacy integer quantity (backward compat)', () => {
    expect(validate(Decimal.fromLong(100n))).toBe(VALID);
  });
});

// CAT-104: FeeCalculationEnrichment — no floating-point drift
describe('FeeCalculationEnrichment — BigDecimal arithmetic', () => {
  it('calculates fee without floating-point drift', () => {
    const fee = calculateFee(new Decimal('100.5'), new Decimal('0.0025'));
    expect(fee.toFixed(8)).toBe('0.25125000');
    // floating-point double would give: 0.25124999999999997
  });
  it('uses HALF_EVEN rounding (banker rounding)', () => {
    const fee = calculateFee(new Decimal('100.125'), new Decimal('0.1'));
    expect(fee.toFixed(8)).toBe('10.01250000'); // not 10.0125000001...
  });
});

// CAT-105: PositionAggregationEnrichment
describe('PositionAggregationEnrichment — fractional netting', () => {
  it('nets fractional positions exactly', () => {
    const positions = [
      { qty: new Decimal('100.5'), side: 'BUY' },
      { qty: new Decimal('50.25'), side: 'BUY' },
      { qty: new Decimal('75.1'), side: 'SELL' },
    ];
    expect(aggregate(positions).toFixed(8)).toBe('75.65000000');
  });
});

// CAT-107: CatSubmissionFormatter — FINRA wire format
describe('CatSubmissionFormatter', () => {
  it('formats fractional quantity to 8dp in FINRA wire message', () => {
    const msg = format({ executionQuantity: new Decimal('100.5') });
    expect(msg.executionQty).toBe('100.50000000');
  });
  it('formats legacy integer quantity as 8dp string', () => {
    const msg = format({ executionQuantity: Decimal.fromLong(100n) });
    expect(msg.executionQty).toBe('100.00000000');
  });
  it('FINRA dry-run: formatted message matches XSD schema', () => {
    const msg = format({ executionQuantity: new Decimal('0.00000001') });
    expect(validateFINRASchema(msg)).toBe(true);
  });
});

// Contract test: Avro schema backward compatibility
describe('Avro schema evolution — BACKWARD_TRANSITIVE', () => {
  it('new schema deserialises old Long messages', () => {
    const oldMsg = serializeAsLong(100n);
    const decoded = deserializeAsDecimal(oldMsg);
    expect(decoded.toFixed(8)).toBe('100.00000000');
  });
  it('schema registry accepts new schema at BACKWARD_TRANSITIVE', async () => {
    const result = await schemaRegistry.checkCompatibility(
      'execution-quantity-value',
      newDecimalSchema
    );
    expect(result.isCompatible).toBe(true);
  });
});
```

---

### Phase 3 — Implementation: Strangler Fig with Feature Flag

The safest brownfield pattern — used by Amazon for service refactors. Run old and new code paths in parallel, gated by a flag.

```
Old path:  qty: Long   → unchanged enrichments (integer arithmetic)
                                    ↑
Feature flag ───────────────────────┤  CAT_QUANTITY_PRECISION_ENABLED
                                    ↓
New path:  qty: Decimal → precision-aware enrichments (BigDecimal arithmetic)
```

#### Implementation Pattern (each enrichment)

```java
// BEFORE (Long path — do not modify this code)
class QuantityValidationEnrichment {
    ValidationResult validate(long qty) {
        return qty > 0 && qty <= MAX_SHARES_LONG
            ? VALID : INVALID;
    }
}

// AFTER (feature-flagged dispatch + new Decimal implementation)
class QuantityValidationEnrichment {

    // New Decimal path (new code — covered by CAT-103 tests)
    ValidationResult validate(BigDecimal qty) {
        return qty.compareTo(BigDecimal.ZERO) > 0
            && qty.compareTo(MAX_SHARES_DECIMAL) <= 0
            ? VALID : INVALID;
    }

    // Entry point — flag-gated dispatch (both paths covered by tests)
    ValidationResult validate(ExecutionEvent event) {
        if (featureFlags.isEnabled("CAT_QUANTITY_PRECISION")) {
            return validate(event.getQuantityAsDecimal());
        }
        return validate(event.getQuantityAsLong());   // unchanged
    }
}
```

#### Avro Schema Evolution

```json
// v1 — existing schema (do not modify)
{
  "name": "executionQuantity",
  "type": "long"
}

// v2 — new schema (BACKWARD_TRANSITIVE compatible with v1)
{
  "name": "executionQuantity",
  "type": {
    "type": "bytes",
    "logicalType": "decimal",
    "precision": 18,
    "scale": 8
  },
  "default": "\u0000"
}
```

**Compatibility contract:**
- Old consumers (Long) reading v2 messages → Avro coerces, truncates scale (safe for integer quantities)
- New consumers (Decimal) reading v1 messages → treat Long as Decimal with scale=0

#### DB Migration (backward-compatible)

```sql
-- Step 1: Add new column (non-breaking)
ALTER TABLE execution_events
  ADD COLUMN execution_quantity_decimal NUMERIC(18,8);

-- Step 2: Backfill (run offline, no table lock)
UPDATE execution_events
  SET execution_quantity_decimal = execution_quantity::NUMERIC(18,8)
  WHERE execution_quantity_decimal IS NULL;

-- Step 3: Flip application to write both columns (during flag ramp)

-- Step 4: Drop old column ONLY after flag=ON, all consumers migrated
-- ALTER TABLE execution_events DROP COLUMN execution_quantity;
-- ALTER TABLE execution_events RENAME COLUMN execution_quantity_decimal
--   TO execution_quantity;
```

---

### Phase 4 — Commit Gates

Nothing merges to main without all gates green.

```yaml
# CI pipeline — required status checks
gates:
  type-check:
    description: No implicit any, strict types on all enrichments
    fail-on: TypeScript errors

  lint-no-float:
    description: Custom lint rule — no double/float in enrichment paths
    rule: ban-types [double, float, Double, Float] in src/enrichments/**
    fail-on: Any floating-point type in enrichment code

  unit-tests:
    description: All enrichment unit tests pass
    coverage-threshold: 90% on changed enrichments
    fail-on: Any test failure or coverage drop

  contract-tests:
    description: Pact consumer-driven contract tests
    providers: [QuantityValidation, FeeCalculation, PositionAggregation,
                DuplicateDetection, CatSubmission]
    fail-on: Any consumer contract violation

  schema-registry:
    description: Avro schema BACKWARD_TRANSITIVE compatibility check
    subjects: [execution-quantity-key, execution-quantity-value]
    compat-level: BACKWARD_TRANSITIVE
    fail-on: Compatibility check failure

  cat-format-validation:
    description: FINRA CAT message format conforms to FINRA XSD
    schema: finra-cat-v3.2.xsd
    fail-on: XSD validation failure on sample messages

  performance:
    description: Decimal enrichment latency within 5% of Long baseline
    baseline: p99 latency with Long path
    threshold: 5% overhead
    fail-on: Threshold exceeded
```

---

### Phase 5 — Release: Canary Pattern

```
Week 1: Deploy to prod — flag OFF
        Zero impact. New code is dormant. Verify deployment health.

Week 2: Flag ON in staging
        Run full regression suite.
        FINRA dry-run submission (staging FINRA endpoint).
        Validate: all CAT messages accepted by FINRA test environment.

Week 3: Canary — flag ON for 1% of order flow
        Monitor:
          • FINRA ACK rate (target: ≥ 99.9%)
          • FINRA NAK/rejection rate (alert if > 0.1%)
          • Downstream reconciliation delta (risk, position systems)
          • Enrichment p99 latency (alert if > 5% above baseline)

Week 4: Ramp
        1% → 10% (Day 1, monitor 4h)
        10% → 50% (Day 2, monitor 4h)
        50% → 100% (Day 3, monitor 8h)
        Auto-rollback triggers active throughout.

Week 5: Cleanup
        Remove feature flag from all enrichments.
        Delete Long code path.
        Drop old DB column.
        Archive RFC as ADR (Architecture Decision Record).
```

#### Auto-Rollback Trigger (Amazon Deployment Guardrails pattern)

```yaml
guardrails:
  - metric: finra_rejection_rate
    threshold: 0.1%
    window: 5 minutes
    action: flip flag OFF, page on-call, open P1 incident

  - metric: enrichment_p99_latency_increase
    threshold: 10%
    window: 5 minutes
    action: flip flag OFF, notify team

  - metric: position_reconciliation_break_count
    threshold: 1
    window: 1 hour
    action: flip flag OFF, escalate to risk team
```

---

## 5. Industry Paths Compared

### Amazon — Working Backwards + Kiro + Deployment Guardrails

```
Customer/regulator need (FINRA)
  → PRFAQ (what does the customer/regulator gain?)
    → Design Doc (how do we build it safely?)
      → Kiro spec (machine-readable tasks for AI execution)
        → Two-pizza team owns change end-to-end
          → Operational Readiness Review (ORR) — rollback runbook required
            → Deployment guardrails (auto-rollback on SLO breach)
              → No manual release approval — fully automated gates
```

**Strengths:** ORR forces rollback documentation. Guardrails provide automatic safety net.
**Best for:** This FINRA CAT change — the ORR and guardrails map directly to compliance requirements.

---

### Google — Design Doc + Code Owner Review + SLO-gated Canary

```
Design Doc (Google Docs, public within org)
  → Reviewed by Tech Leads and domain owners
    → Implementation in feature branch
      → Mandatory code owner review for compliance-touching files
        → Presubmit tests (all gates must pass before merge)
          → 1% canary via traffic splitting in production
            → Gradual rollout with SLO-based promotion
```

**Strengths:** Broad org visibility — all stakeholders review the design doc.
**Best for:** When multiple teams consume the changed field (your 5 enrichments owned by different squads).

---

### Stripe — RFC + Consumer-Driven Contract Tests + Dark Launch

```
RFC in GitHub (markdown PR, reviewed by domain owners)
  → Consumer-driven contract tests (Pact) written first by consumers
    → Provider implements until all consumer contracts pass
      → Schema registry enforces backward compatibility automatically
        → Dark launch: shadow traffic on new code path (no user impact)
          → Feature flag flip: new path live, old path removed post-validation
```

**Strengths:** Contract tests eliminate integration surprises. Shadow traffic catches bugs without FINRA impact.
**Best for:** Event-driven systems with many consumers — exactly the FINRA CAT enrichment fan-out pattern.

---

### Netflix — ADR + Spinnaker + Chaos Engineering

```
Architecture Decision Record (ADR) committed to repo
  → Feature branch + automated testing
    → Spinnaker pipeline: staging → canary → full prod
      → Chaos engineering: verify enrichment handles Decimal parse errors gracefully
        → Automated canary analysis (Kayenta) compares old vs new metrics
```

**Strengths:** Automated canary analysis removes human judgment from rollout decisions.
**Best for:** High-throughput systems where manual monitoring is impractical.

---

## 6. Recommended Path for FINRA CAT

**Given:** Brownfield, regulatory stakes (FINRA), multiple consuming enrichments,
precision/scale change with compliance sign-off requirement.

### Follow Stripe's RFC + Contract-First pattern, with Amazon's ORR gate

```
Step 1 — RFC
  Write the RFC document (Phase 0 above).
  Get compliance, legal, and RegTech sign-off before any code.
  Attach FINRA's specification reference for Decimal(18,8).

Step 2 — Jira epic from RFC delta
  Generate one story per enrichment (CAT-101 to CAT-110).
  Link every story to the RFC document.
  Assign each story to the team owning that enrichment.

Step 3 — Consumer contract tests (Pact) — written by consumers first
  Each enrichment team writes Pact contracts for the new Decimal field.
  Provider (schema/event team) runs contract tests before implementation.
  Schema registry configured to BACKWARD_TRANSITIVE.

Step 4 — Avro schema evolution in schema registry
  Register v2 schema. Verify BACKWARD_TRANSITIVE compatibility.
  Do not change any enrichment code until schema is stable.

Step 5 — Feature flag per enrichment (not one global flag)
  Granular flags give per-enrichment rollback:
    CAT_QTY_PRECISION_VALIDATION=OFF
    CAT_QTY_PRECISION_FEE=OFF
    CAT_QTY_PRECISION_POSITION=OFF
    CAT_QTY_PRECISION_DEDUP=OFF
    CAT_QTY_PRECISION_FORMATTER=OFF
  Roll out one enrichment at a time — isolates blast radius.

Step 6 — Canary at the CatSubmissionFormatter level
  The formatter is the last enrichment before FINRA wire.
  Canary 1% of submissions → monitor FINRA ACK rate.
  This is the highest-value signal and the last safety gate.

Step 7 — FINRA dry-run in staging before any prod flag flip
  Run 10,000 sample CAT messages with Decimal qty through staging.
  Confirm FINRA test environment ACKs all messages.
  Attach dry-run results to the Jira epic as evidence.

Step 8 — Monitor FINRA ACK/NAK rate as release health metric
  FINRA rejection rate is the single most important business metric.
  Auto-rollback if rejection rate exceeds 0.1% for 5 minutes.
  Human escalation if rejection rate exceeds 0.5%.

Step 9 — Cleanup after 100% rollout
  Remove all feature flags.
  Delete Long code path.
  Execute DB column rename migration.
  Commit ADR to repository: "Why we use Decimal(18,8) for executionQuantity"
```

---

## 7. Claude Code Integration

With Claude Code, this entire workflow is automated from the RFC forward.

### CLAUDE.md for the CAT Precision Epic

```markdown
# CLAUDE.md — CAT executionQuantity Precision Epic

## Context
Read docs/rfc-execution-quantity-precision.md before ANY code change.
This is a regulatory change. Backward compatibility is non-negotiable.
Feature flag: CAT_QUANTITY_PRECISION_ENABLED (default OFF).

## Rules
- NEVER use float or double in enrichment code — use BigDecimal / Decimal
- NEVER remove the Long code path until flag=ON at 100% for 7 days
- ALL enrichments must pass contract tests before merging
- FINRA dry-run is required before flag flip in production

## Enrichments in Scope
1. QuantityValidationEnrichment (CAT-103)
2. FeeCalculationEnrichment (CAT-104)
3. PositionAggregationEnrichment (CAT-105)
4. DuplicateDetectionEnrichment (CAT-106)
5. CatSubmissionFormatter (CAT-107)
```

### Claude Code Workflow Commands

```bash
# Before any implementation — Claude reads RFC and generates all task files
/sync-jira          # pull CAT-101 to CAT-110 from Jira via MCP

# For each enrichment story
/build-all          # type-check + lint + unit + contract + schema-registry

# Before staging flag flip
/sprint-report      # verify all 10 stories DONE before requesting ORR

# Claude agents per task type
Architect agent  → schema evolution design, flag architecture
Tester agent     → Pact contracts, boundary test fixtures
Jira Integrator  → story updates, AC verification
Reporter agent   → ORR document, ADR generation
```

### Loop Execution

```bash
# Claude autonomously executes all 10 stories in dependency order:
# CAT-101 → CAT-102 → CAT-103 → CAT-104 → CAT-105 →
# CAT-106 → CAT-107 → CAT-108 → CAT-109 → CAT-110
# Stops if any gate fails (BLOCKED status in TASK_REGISTRY)
# Reports: what was done, what is next, what needs human sign-off
```

---

## Summary Checklist

### Before Writing Any Code
- [ ] RFC written and reviewed by compliance, legal, RegTech
- [ ] FINRA CAT Rule 613 field format specification referenced
- [ ] Blast radius documented (all 5 enrichments listed)
- [ ] Backward compatibility strategy confirmed
- [ ] Rollback plan tested in a non-production environment

### During Implementation
- [ ] Feature flags in place before first enrichment is changed
- [ ] Tests written before implementation (red → green)
- [ ] No float/double used in any enrichment path
- [ ] Contract tests passing for all consumers
- [ ] Schema registry at BACKWARD_TRANSITIVE

### Before Production Release
- [ ] FINRA dry-run completed in staging (10,000+ sample messages)
- [ ] Operational Readiness Review (ORR) completed
- [ ] Auto-rollback guardrails configured
- [ ] On-call runbook updated
- [ ] Compliance sign-off attached to Jira epic

### After 100% Rollout
- [ ] Feature flags removed from all enrichments
- [ ] Long code path deleted
- [ ] DB column migration completed
- [ ] ADR committed to repository
- [ ] Post-implementation review completed with FINRA ACK rate data

---

*Built with Claude Code — https://claude.ai/claude-code*
*Reference: FINRA CAT Rule 613 | Avro Schema Evolution | Stripe RFC Process | Amazon Working Backwards*
