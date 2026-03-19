# RFC-2026-014 — FINRA CAT executionQuantity Precision Change

**Status:** APPROVED
**Author:** Trade Processing Team
**Date:** 2026-02-15
**Decision Date:** 2026-02-22
**Jira Epic:** [CAT-100](https://acme.atlassian.net/browse/CAT-100)
**ADR:** ADR-022 (linked below)

---

## 1. Problem Statement

FINRA CAT Rule 613 Amendment (effective 2026-04-01) requires `executionQuantity` to support
**fractional share precision up to 8 decimal places**. Our current implementation stores
quantity as `Long` (whole shares only), which will fail regulatory validation starting Q2 2026.

**Current state:** `executionQuantity: Long` (e.g., `100`)
**Required state:** `executionQuantity: Decimal(18,8)` (e.g., `100.00000000`)

**Affected downstream consumers:**

| System | Impact | Enrichment Class |
|--------|--------|-----------------|
| Fee Calculation | Fee = qty × rate; rate changes with fractional | `FeeCalculationEnrichment` |
| Position Aggregation | Net position must accumulate fractional shares | `PositionAggregationEnrichment` |
| FINRA CAT Formatter | Must serialize 8 dp in CAT submission | `CatSubmissionFormatter` |
| Risk Limit Check | Notional = qty × price; must not truncate | `QuantityValidationEnrichment` |

---

## 2. Proposed Change

### 2a. Avro Schema (BACKWARD_TRANSITIVE evolution)

```json
// BEFORE (v1)
{ "name": "executionQuantity", "type": "long" }

// AFTER (v2)
{
  "name": "executionQuantity",
  "type": { "type": "bytes", "logicalType": "decimal", "precision": 18, "scale": 8 },
  "default": "\u0000"
}
```

New v2 messages carry BigDecimal. Old v1 consumers read the default `\u0000` (BigDecimal 0)
until they are upgraded — safe for read-only consumers, but enrichment consumers **must** be
upgraded before the FINRA deadline.

### 2b. Java Domain Object

```java
// BEFORE
record ExecutionEvent(String executionId, long executionQuantity, ...) {}

// AFTER
record ExecutionEvent(String executionId, BigDecimal executionQuantity, ...) {}
```

### 2c. Feature Flag Strategy

All enrichments are migrated behind a feature flag `cat.quantity.precision.v2` using
OpenFeature SDK. Flag is set per-environment:

| Environment | Flag Value | Behavior |
|-------------|-----------|---------|
| dev | `true` | New BigDecimal path active |
| staging | `true` | Validation and regression |
| prod | `false` → `true` (canary) | Graduated rollout |

---

## 3. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Precision loss in fee calculation | Medium | High | Exact BigDecimal arithmetic, scale=8 enforced |
| Schema incompatibility (old consumers) | Low | High | BACKWARD_TRANSITIVE; old consumers get default 0 |
| Performance regression (BigDecimal > Long) | Low | Medium | Benchmarked: < 2% overhead at 50k events/sec |
| Missed FINRA deadline | Low | Critical | Feature flag enables instant rollback |

---

## 4. Rollout Plan

1. **Week 1:** Schema registered in dev registry; unit tests red → green
2. **Week 2:** Enrichments migrated, integration tests pass in staging
3. **Week 3:** Consumer Pact contracts verified across all consumers
4. **Week 4:** Canary 1% prod traffic → 10% → 100% over 3 days; auto-rollback if DLQ > 0.1%

---

## 5. Rollback Plan

1. Set feature flag `cat.quantity.precision.v2 = false` in LaunchDarkly (< 30 seconds)
2. New messages revert to Long serialization
3. No schema rollback required (v1 schema still registered)

---

## 6. Alternatives Considered

| Alternative | Reason Rejected |
|-------------|----------------|
| String representation of quantity | Parsing overhead; no arithmetic operators |
| Double precision float | Precision loss (IEEE 754); banned by ADR-007 |
| New field `executionQuantityV2` alongside old field | Schema bloat; consumers must handle both; rejected by FINRA |
| Big-bang migration (no feature flag) | Too risky; no rollback for regulatory system |

---

## 7. Decision

**Use BigDecimal with Avro decimal logical type, behind OpenFeature flag, with strangler fig pattern.**

Approved by: Trade Arch Board (2026-02-22)
ADR recorded: ADR-022
