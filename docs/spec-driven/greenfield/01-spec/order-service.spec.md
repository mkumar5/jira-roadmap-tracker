# Spec: Order Notification Service

**Spec ID:** ONS-SPEC-001
**Tool:** Kiro (AI-assisted) → reviewed by Tech Lead
**Status:** APPROVED
**Version:** 1.0
**Generated from PRD:** `../00-prd.md`

---

## Overview

The `OrderNotificationService` listens to execution confirmations from the `ExecutionRepository`
and publishes structured Avro events to Kafka topic `trade.executions.v1`.

---

## Functional Requirements

### FR-1: Publish on Execution Confirmation

```
GIVEN  an order execution is confirmed in the ExecutionRepository
WHEN   the service receives the confirmation callback
THEN   it publishes an OrderExecutedEvent to Kafka within 500 ms
AND    the event contains: orderId, executionId, symbol, quantity, price, executedAt
AND    quantity is represented as BigDecimal with scale 8
AND    price is represented as BigDecimal with scale 4
```

### FR-2: Idempotency

```
GIVEN  the same execution confirmation arrives twice (retry/duplicate)
WHEN   the service processes both
THEN   only ONE event is published (deduplicated by executionId)
AND    the second is discarded with a WARN log
```

### FR-3: Schema Compatibility

```
GIVEN  a new field is added to OrderExecutedEvent in a future version
WHEN   the schema is registered in Schema Registry
THEN   registration succeeds only if BACKWARD_TRANSITIVE compatibility holds
AND    old consumers can still deserialize new events (new fields have defaults)
```

### FR-4: Dead Letter Queue

```
GIVEN  Kafka publish fails after 3 retries
WHEN   the circuit breaker opens
THEN   the event is written to the dead-letter topic `trade.executions.dlq`
AND    an alert fires on the `order-notifications` PagerDuty service
```

---

## Non-Functional Requirements

| ID | Requirement | Threshold |
|----|-------------|-----------|
| NFR-1 | Publish latency P99 | < 500 ms |
| NFR-2 | Throughput | ≥ 50,000 events/sec |
| NFR-3 | Availability | 99.95% |
| NFR-4 | Zero data loss | RPO = 0 (idempotent producer) |

---

## API Contract

### Input: Execution Confirmation Callback

```java
interface ExecutionConfirmationListener {
    void onExecutionConfirmed(ExecutionConfirmation confirmation);
}

record ExecutionConfirmation(
    String orderId,           // e.g. "ORD-2026-0001"
    String executionId,       // unique per fill, e.g. "EX-20260301-0042"
    String symbol,            // e.g. "AAPL"
    BigDecimal quantity,      // e.g. 100.00000000 (scale=8)
    BigDecimal price,         // e.g. 182.3400 (scale=4)
    Instant executedAt        // UTC execution timestamp
) {}
```

### Output: Kafka Event (Avro)

See `order-events.avsc` for the full Avro schema.

---

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| `org.apache.kafka:kafka-clients` | 3.7.x | Kafka producer |
| `io.confluent:kafka-avro-serializer` | 7.6.x | Schema Registry Avro |
| `org.apache.avro:avro` | 1.11.x | Avro code gen |
| `io.github.resilience4j:resilience4j-circuitbreaker` | 2.2.x | Circuit breaker |

---

## Jira Stories Generated from This Spec

| Story | Title | Points |
|-------|-------|--------|
| ONS-101 | Define Avro schema + register in Schema Registry | 3 |
| ONS-102 | Implement ExecutionConfirmationListener | 5 |
| ONS-103 | Kafka producer with idempotent config | 5 |
| ONS-104 | Deduplication logic (executionId cache) | 3 |
| ONS-105 | Dead letter queue + PagerDuty alert | 3 |
| ONS-106 | Integration tests with embedded Kafka | 5 |
| ONS-107 | Contract tests with Pact (Risk consumer) | 3 |
| ONS-108 | Load test: 50k events/sec | 3 |
| ONS-109 | Kubernetes deployment + HPA | 2 |
| ONS-110 | Runbook + on-call alert docs | 1 |

**Total:** 33 story points across 1 sprint (2 weeks, team of 4)
