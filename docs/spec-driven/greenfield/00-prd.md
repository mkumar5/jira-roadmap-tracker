# PRD — Order Notification Service

**Author:** Product — Trade Lifecycle Team
**Status:** Approved
**Date:** 2026-03-01
**Jira Epic:** [ONS-100](https://acme.atlassian.net/browse/ONS-100)

---

## 1. Problem Statement

Downstream consumers (compliance, risk, client-facing systems) have no real-time notification
when an order execution is confirmed. They poll the execution DB every 30 seconds, causing:

- **P99 latency spikes** when 1,000+ consumers poll simultaneously
- **Missed fills** during high-volatility windows (DB lock contention)
- **Regulatory lag**: FINRA CAT requires sub-5-second reporting; polling adds 30 s worst case

## 2. Goal

Deliver an **event-driven Order Notification Service** that publishes `OrderExecutedEvent`
to Kafka within **500 ms** of execution confirmation, eliminating all downstream polling.

## 3. Non-Goals

- This service does NOT modify order lifecycle state (read-only from execution DB)
- No UI — backend service only
- No client-facing API (events only)

## 4. Success Metrics

| Metric | Target |
|--------|--------|
| P99 notification latency | < 500 ms |
| Consumer polling eliminated | 100% |
| FINRA CAT reporting lag | < 5 s end-to-end |
| Duplicate events per execution | 0 |
| Throughput | ≥ 50,000 events/sec burst |

## 5. User Stories (Business Level)

1. As **Compliance**, I receive an `OrderExecutedEvent` within 500 ms so I can report to FINRA CAT.
2. As **Risk**, I consume execution events to update real-time position without polling.
3. As **Ops**, I can replay events for any time window to recover from downstream outages.

## 6. Constraints

- **Language:** Java 21
- **Messaging:** Apache Kafka (existing cluster, topic `trade.executions.v1`)
- **Schema:** Avro with Schema Registry (BACKWARD_TRANSITIVE compatibility required)
- **Auth:** mTLS between service and Kafka brokers
- **Deployment:** Kubernetes, 3 replicas minimum

## 7. Open Questions (Resolved)

| # | Question | Resolution |
|---|----------|------------|
| 1 | Exactly-once delivery? | Use Kafka idempotent producer + `EXACTLY_ONCE_V2` |
| 2 | Replay mechanism? | Kafka retention 7 days; consumers use offset seek |
| 3 | Schema versioning? | Avro BACKWARD_TRANSITIVE; registry enforced in CI |
