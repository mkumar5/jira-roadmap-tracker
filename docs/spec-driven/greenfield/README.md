# Greenfield Example — Order Notification Service

**Scenario:** Building a new event-driven service from scratch to publish `OrderExecutedEvent`
to Kafka within 500ms of execution confirmation, eliminating downstream polling.

**Pattern:** PRD → Spec (Kiro) → Jira Stories → TDD → Implement → Canary Release

---

## Directory Structure

```
greenfield/
├── 00-prd.md                              ← Working Backwards PRD (Amazon style)
├── 01-spec/
│   ├── order-service.spec.md              ← Kiro-generated functional spec
│   ├── order-api.yaml                     ← OpenAPI 3.1 admin API spec
│   └── order-events.avsc                  ← Avro event schema (BACKWARD_TRANSITIVE)
├── 02-stories/
│   └── TASK_REGISTRY.md                   ← Jira stories derived from spec
├── 03-tests/                              ← Written BEFORE implementation (TDD red)
│   ├── OrderNotificationServiceTest.java  ← JUnit 5 + embedded Kafka tests
│   └── order-service.feature              ← Gherkin BDD scenarios
└── 04-implementation/                     ← Implementation (TDD green)
    ├── OrderExecutedEvent.java            ← Domain event (BigDecimal qty/price)
    └── OrderNotificationService.java      ← Publisher + dedup + DLQ + circuit breaker
```

---

## Workflow: Spec → Jira → Code → Release

```
00-prd.md          "Working Backwards" from customer need
    │               → defines success metrics, constraints, non-goals
    ▼
01-spec/*.spec.md  Kiro reads PRD and generates spec
    │               → FR-1 to FR-4, NFR-1 to NFR-4, API contract
    ▼
01-spec/*.avsc     Avro schema defined BEFORE any code
    │               → consumers write contract tests against this schema
    ▼
02-stories/        Spec → Jira epic + 10 stories (automated or manual)
    │               → each story has acceptance criteria from spec FRs
    ▼
03-tests/          Tests written FIRST (TDD red phase)
    │               → all tests fail: service doesn't exist yet
    │               → Gherkin scenarios are the living specification
    ▼
04-implementation/ Implementation written to make tests green
    │               → circuit breaker, dedup cache, DLQ routing
    ▼
CI Gate            Schema compatibility check + all tests green + load test
    │               → blocks merge if P99 > 500ms or dedup fails
    ▼
Canary Release     1% → 10% → 100% prod traffic
                   → auto-rollback if DLQ rate > 0.1%
```

---

## Key Design Decisions

### BigDecimal for all financial values

```java
// quantity: scale=8 (fractional shares)
private static final BigDecimal QUANTITY = new BigDecimal("100.00000000");

// price: scale=4 (sub-penny)
private static final BigDecimal PRICE = new BigDecimal("182.3400");
```

Never `double` or `float` — see ADR-007.

### Idempotency via dedup cache

```java
if (deduplicationCache.contains(execId)) {
    log.warn("Duplicate execution discarded: {}", execId);
    return CompletableFuture.completedFuture(null);
}
```

Cache key = `executionId`. TTL = 24h. Backed by Redis in production.
Mark as processed ONLY after Kafka ack (at-least-once guarantee).

### Resilience4j circuit breaker

```
Closed → (50% failures in 10 calls) → Open → (30s wait) → Half-Open → Closed
```

When open: route to DLQ + PagerDuty alert + continue accepting new events.

---

## Running the Tests

```bash
# All tests (requires embedded Kafka — no external dependencies)
mvn test -pl order-notification-service

# Just the BDD scenarios
mvn test -Dtest=OrderNotificationServiceBddTest

# Just the integration tests
mvn test -Dtest=OrderNotificationServiceTest

# Load test (ONS-108 — separate from CI)
k6 run tests/load/order-notification-load.js
```
