# Gherkin BDD — Order Notification Service
# Story: ONS-106
# These scenarios are the executable contract between Product and Engineering.
# Run with: mvn test -Dtest=OrderNotificationServiceBddTest

Feature: Order Notification Service publishes execution events

  Background:
    Given the Order Notification Service is running
    And an embedded Kafka broker is available on port 9092
    And Schema Registry is seeded with the "OrderExecutedEvent" v1 schema

  # ─── Happy Path ────────────────────────────────────────────────────────────

  Scenario: Confirmed execution is published to Kafka within 500ms
    Given an order "ORD-2026-0001" exists for symbol "AAPL"
    When the execution "EX-20260301-0042" is confirmed with:
      | field     | value         |
      | quantity  | 100.00000000  |
      | price     | 182.3400      |
      | side      | BUY           |
    Then an "OrderExecutedEvent" is published to topic "trade.executions.v1"
    And the event contains:
      | field       | value              |
      | orderId     | ORD-2026-0001      |
      | executionId | EX-20260301-0042   |
      | symbol      | AAPL               |
      | quantity    | 100.00000000       |
      | price       | 182.3400           |
      | side        | BUY                |
    And the total time from confirmation to Kafka ack is less than 500 milliseconds

  Scenario: Fractional share quantity is preserved with 8 decimal places
    Given an order "ORD-2026-0002" exists for symbol "BRK.B"
    When the execution "EX-20260301-0043" is confirmed with:
      | field     | value         |
      | quantity  | 0.12345678    |
      | price     | 401.2500      |
      | side      | BUY           |
    Then the published event has quantity "0.12345678"
    And no precision is lost in the Avro serialization

  # ─── Idempotency / Deduplication ──────────────────────────────────────────

  Scenario: Duplicate execution confirmation publishes only one event
    Given execution "EX-20260301-0042" was already confirmed and published
    When the same execution "EX-20260301-0042" confirmation arrives again
    Then exactly 1 event with executionId "EX-20260301-0042" exists on "trade.executions.v1"
    And a WARN log entry "Duplicate execution discarded: EX-20260301-0042" is emitted

  Scenario: Different executions for the same order both publish
    Given an order "ORD-2026-0003" has two partial fills
    When executions "EX-20260301-0050" and "EX-20260301-0051" are both confirmed
    Then 2 events are published to "trade.executions.v1"
    And each event has a distinct executionId

  # ─── Dead Letter Queue ─────────────────────────────────────────────────────

  Scenario: Kafka unavailable — event routed to dead letter queue
    Given Kafka is unavailable (simulated: network partition)
    When execution "EX-20260301-0099" is confirmed
    Then after 3 retry attempts the event is written to "trade.executions.dlq"
    And a PagerDuty alert fires on service "order-notifications"
    And the original event payload is preserved in the DLQ entry

  Scenario: DLQ replay succeeds after Kafka recovers
    Given execution "EX-20260301-0099" is in the dead letter queue
    And Kafka has recovered
    When an operator calls POST /dlq/EX-20260301-0099/replay
    Then the event is successfully published to "trade.executions.v1"
    And the DLQ entry is marked as replayed
    And no duplicate event exists (idempotency check passes)

  # ─── Schema Compatibility ─────────────────────────────────────────────────

  Scenario: New optional field added does not break existing consumers
    Given the "OrderExecutedEvent" v1 schema is registered
    When a v2 schema is submitted with a new optional field "brokerCode" with default null
    Then Schema Registry accepts the schema (BACKWARD_TRANSITIVE check passes)
    And a v1 consumer can deserialize a v2 event by ignoring "brokerCode"

  # ─── Non-Functional ───────────────────────────────────────────────────────

  Scenario: Throughput — 50,000 events per second sustained
    Given 50,000 execution confirmations are queued
    When all confirmations are processed concurrently over 1 second
    Then all 50,000 events are published to "trade.executions.v1"
    And no events are in the dead letter queue
    And P99 publish latency is below 500 milliseconds
