# Brownfield Example — FINRA CAT executionQuantity Precision Change

**Scenario:** Migrating `executionQuantity` from `Long` (whole shares) to `Decimal(18,8)` (fractional shares)
across a live FINRA CAT regulatory reporting pipeline, without downtime.

**Pattern:** Strangler Fig + Feature Flag (OpenFeature) + Canary Release

---

## The Problem (AS-IS)

```
┌─────────────────────────────────────────────────────────┐
│  ExecutionEvent.executionQuantity: long                  │
│  (whole shares only, e.g. 100)                           │
│                                                          │
│  Pipeline:                                               │
│  QuantityValidation → FeeCalc → PositionAgg → CatFormatter │
│  (all use long arithmetic — WRONG for fractional shares) │
└─────────────────────────────────────────────────────────┘
```

**Bug impact (v1 with fractional shares):**
- `FeeCalculationEnrichment`: fee = `(long)qty × rate` → qty=0 for fractions → fee=0 (WRONG)
- `PositionAggregationEnrichment`: position = `longQty + prevLong` → fractions truncated
- `CatSubmissionFormatter`: `qty.toString()` → can produce `"1E-8"` → FINRA rejects

---

## The Solution (TO-BE)

```
┌─────────────────────────────────────────────────────────────┐
│  Feature flag: cat.quantity.precision.v2                     │
│                                                              │
│  OFF (default) → Legacy Long path (zero regression risk)     │
│  ON            → BigDecimal path (exact arithmetic)          │
│                                                              │
│  Avro schema evolution: v1(long) → v2(Decimal(18,8))        │
│  BACKWARD_TRANSITIVE — old consumers get default=0           │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
brownfield/
├── 00-rfc.md                              ← RFC-2026-014: design decision
├── 01-as-is/
│   ├── ExecutionEvent.java                ← v1: Long quantity (DEPRECATED)
│   └── QuantityValidationEnrichment.java  ← v1: Long validation (DEPRECATED)
├── 02-spec/
│   ├── execution-quantity-v2.avsc         ← v2 Avro schema (Decimal 18,8)
│   └── execution-quantity-change.feature  ← BDD acceptance criteria
├── 03-tests/                              ← Written BEFORE implementation (TDD red)
│   ├── QuantityValidationEnrichmentTest.java
│   ├── FeeCalculationEnrichmentTest.java
│   └── CatSubmissionFormatterTest.java
└── 04-implementation/                     ← Implementation (TDD green)
    ├── ExecutionEvent.java                ← v2: BigDecimal quantity
    ├── QuantityValidationEnrichment.java  ← Feature-flagged (v1+v2 dispatch)
    ├── FeeCalculationEnrichment.java      ← BigDecimal fee arithmetic
    ├── PositionAggregationEnrichment.java ← BigDecimal position accumulation
    ├── CatSubmissionFormatter.java        ← toPlainString() — no scientific notation
    ├── CatEnrichmentPipeline.java         ← Orchestrator
    └── QuantityValidationException.java   ← Domain exception
```

---

## Key Patterns Demonstrated

### 1. Strangler Fig (Feature Flag)

`QuantityValidationEnrichment.java` dispatches based on the flag:

```java
if (featureClient.getBooleanValue("cat.quantity.precision.v2", false)) {
    return validateBigDecimal(event);   // new path
} else {
    return validateLegacy(event);       // old path — delete after canary
}
```

The old `validateLegacy()` method is kept until the canary reaches 100% and the flag is retired.
Then it's deleted in a single clean-up PR.

### 2. BigDecimal — No Float/Double

```java
// WRONG (v1): fee = qty * rate → 0 for fractional qty (cast to long)
long fee = event.executionQuantity() * ratePerShareBps;  // ← BUG

// CORRECT (v2): exact BigDecimal arithmetic
BigDecimal fee = event.executionQuantity().multiply(finraTafRate)
                      .setScale(8, RoundingMode.HALF_UP);  // ← exact
```

### 3. Avro Schema Evolution

```json
// v1 (long) → v2 (decimal with default="\u0000")
{
  "name": "executionQuantity",
  "type": { "type": "bytes", "logicalType": "decimal", "precision": 18, "scale": 8 },
  "default": "\u0000"  ← old consumers read BigDecimal(0) — safe default
}
```

### 4. FINRA Formatter — toPlainString()

```java
// WRONG: BigDecimal.toString() can produce "1E-8" → FINRA rejects
node.put("executionQuantity", value.toString());

// CORRECT: always use toPlainString()
node.put("executionQuantity", value.toPlainString()); // "0.00000001"
```

---

## Rollout Steps

1. ✅ Schema v2 registered in dev/staging Schema Registry
2. ✅ Unit tests red → green (all 03-tests/ pass)
3. ✅ Integration tests pass in staging
4. 🔵 Canary: `cat.quantity.precision.v2=true` for 1% of prod executions
5. ⬜ Monitor: DLQ rate, fee accuracy, position reconciliation for 24h
6. ⬜ Graduate: 10% → 50% → 100%
7. ⬜ Cleanup: delete `validateLegacy()` method and v1 classes

---

## Rollback

```bash
# LaunchDarkly CLI — instant flag flip (< 30s propagation)
ldcli flag update cat.quantity.precision.v2 --variation off --environment production
```

No schema rollback needed — v1 schema still registered and valid.
