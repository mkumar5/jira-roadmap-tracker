# Task Registry — Order Notification Service (ONS-100)

**Epic:** ONS-100 — Order Notification Service
**Sprint:** 2026-S07 (Mar 16 – Mar 27)
**Team:** Trade Lifecycle (4 engineers)
**Total Points:** 33

---

## Status Legend

| Icon | Status |
|------|--------|
| ⬜ | PENDING |
| 🔵 | IN PROGRESS |
| ✅ | DONE |
| 🔴 | BLOCKED |

---

## Story Breakdown

| # | Story ID | Title | Points | Owner | Status | Notes |
|---|----------|-------|--------|-------|--------|-------|
| 1 | ONS-101 | Define Avro schema + register in Schema Registry | 3 | @alice | ✅ DONE | Schema file: `01-spec/order-events.avsc` |
| 2 | ONS-102 | Implement `ExecutionConfirmationListener` | 5 | @bob | ✅ DONE | See `04-implementation/OrderNotificationService.java` |
| 3 | ONS-103 | Kafka producer with idempotent config | 5 | @bob | ✅ DONE | `EXACTLY_ONCE_V2`, acks=all |
| 4 | ONS-104 | Deduplication logic (executionId cache, TTL 24h) | 3 | @carol | ✅ DONE | Redis TTL-based set |
| 5 | ONS-105 | Dead letter queue + PagerDuty alert | 3 | @carol | 🔵 IN PROGRESS | PD integration pending on-call config |
| 6 | ONS-106 | Integration tests with embedded Kafka | 5 | @dave | 🔵 IN PROGRESS | See `03-tests/OrderNotificationServiceTest.java` |
| 7 | ONS-107 | Contract tests with Pact (Risk consumer) | 3 | @alice | ⬜ PENDING | Blocked by Risk team providing Pact file |
| 8 | ONS-108 | Load test: 50k events/sec sustained 5 min | 3 | @bob | ⬜ PENDING | After ONS-106 green |
| 9 | ONS-109 | Kubernetes deployment + HPA | 2 | @dave | ⬜ PENDING | After load test passes |
| 10 | ONS-110 | Runbook + on-call alert docs | 1 | @alice | ⬜ PENDING | |

---

## Acceptance Criteria (Sprint Gate)

Before sprint close, ALL of the following must be green:

- [ ] All unit tests pass (`mvn test`)
- [ ] Integration test with embedded Kafka passes
- [ ] Avro schema registered in staging Schema Registry
- [ ] P99 publish latency < 500 ms (load test result attached)
- [ ] DLQ alert fires in PagerDuty staging environment
- [ ] Pact contract published to broker and passes provider verification
- [ ] Kubernetes deployment stable for 30 min in staging

---

## Dependency Map

```
ONS-101 (schema)
    │
    ▼
ONS-102 (listener) ──► ONS-103 (producer)
                              │
                    ┌─────────┤
                    ▼         ▼
                ONS-104    ONS-105
                (dedup)    (DLQ)
                    │
                    ▼
                ONS-106 (integration tests)
                    │
          ┌─────────┤
          ▼         ▼
       ONS-107   ONS-108
      (contract) (load)
                    │
                    ▼
                ONS-109 (k8s)
                    │
                    ▼
                ONS-110 (runbook)
```

---

## Blocked Items

| Story | Blocker | Owner | ETA |
|-------|---------|-------|-----|
| ONS-107 | Risk team must provide Pact consumer file | Risk Eng Lead | 2026-03-22 |
