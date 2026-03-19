# Gherkin BDD — FINRA CAT executionQuantity Precision Change
# RFC: RFC-2026-014
# Stories: CAT-101 through CAT-110
#
# These scenarios are the executable acceptance criteria for the
# brownfield migration. Written BEFORE the implementation (TDD red → green).
#
# Run: mvn test -Dtest=ExecutionQuantityBddTest
# Feature flag: cat.quantity.precision.v2

Feature: FINRA CAT executionQuantity supports fractional share precision

  Background:
    Given the FINRA CAT enrichment pipeline is running
    And Schema Registry has the "ExecutionEvent" v2 schema registered

  # ─── Flag OFF: Legacy Path (v1 behavior unchanged) ────────────────────────

  Rule: When feature flag "cat.quantity.precision.v2" is OFF, the legacy Long path is used

    Scenario: Whole-share execution processes correctly on legacy path
      Given the feature flag "cat.quantity.precision.v2" is OFF
      When an execution event arrives with executionQuantity 100 (long)
      Then QuantityValidationEnrichment accepts the quantity
      And FeeCalculationEnrichment computes fee using integer arithmetic
      And CatSubmissionFormatter serializes quantity as "100" (no decimal)

    Scenario: Fractional share execution is rejected on legacy path
      Given the feature flag "cat.quantity.precision.v2" is OFF
      When an execution event arrives with executionQuantity 0.12345678 (BigDecimal)
      Then QuantityValidationEnrichment throws QuantityValidationException
      And the event is routed to the dead letter queue
      And an alert fires with message "Fractional quantity rejected: feature flag off"

  # ─── Flag ON: New BigDecimal Path ────────────────────────────────────────

  Rule: When feature flag "cat.quantity.precision.v2" is ON, BigDecimal path is active

    Scenario: Fractional share execution is accepted and processed
      Given the feature flag "cat.quantity.precision.v2" is ON
      When an execution event arrives with executionQuantity 0.12345678
      Then QuantityValidationEnrichment accepts the fractional quantity
      And the enriched event has executionQuantity 0.12345678 with scale 8
      And no precision is lost

    Scenario: Whole-share execution still processes correctly on new path
      Given the feature flag "cat.quantity.precision.v2" is ON
      When an execution event arrives with executionQuantity 100
      Then QuantityValidationEnrichment accepts the quantity
      And the enriched event has executionQuantity 100.00000000 with scale 8

    Scenario: Fee calculation uses exact BigDecimal arithmetic for fractional shares
      Given the feature flag "cat.quantity.precision.v2" is ON
      And the fee rate is 0.0035 per share
      When an execution arrives with executionQuantity 0.50000000
      Then the computed fee is exactly 0.00175000
      And the fee has scale 8 (no rounding error)
      And the result is NOT computed via double arithmetic

    Scenario: Position aggregation accumulates fractional shares without precision loss
      Given the feature flag "cat.quantity.precision.v2" is ON
      And a position already holds 99.88888888 shares of AAPL
      When a BUY execution arrives for 0.11111112 shares of AAPL
      Then the new net position is exactly 100.00000000 shares
      And the result is NOT 99.99999999 or 100.00000001 (float rounding artifacts)

    Scenario: FINRA CAT submission serializes quantity with 8 decimal places
      Given the feature flag "cat.quantity.precision.v2" is ON
      When an execution with executionQuantity 0.12345678 is formatted for CAT submission
      Then the CAT report contains executionQuantity "0.12345678"
      And the field is NOT truncated or rounded

    Scenario: Notional value computation is exact
      Given the feature flag "cat.quantity.precision.v2" is ON
      When an execution arrives:
        | field             | value       |
        | executionQuantity | 0.12345678  |
        | executionPrice    | 182.3400    |
      Then the gross notional is exactly 22.5047979972 (scale 10)
      And the value is NOT 22.504797997 or 22.5047979971 (truncation artifacts)

  # ─── Schema Compatibility ────────────────────────────────────────────────

  Rule: v2 schema is backward compatible with v1 consumers

    Scenario: v1 consumer reads v2 event and receives default quantity
      Given a v2 event is published with executionQuantity 100.00000000
      When a v1 consumer (Long schema) deserializes the event
      Then the consumer receives executionQuantity 0 (the schema default)
      And no deserialization exception is thrown

    Scenario: v2 schema registration passes backward transitive compatibility check
      When the v2 "ExecutionEvent" schema is submitted to Schema Registry
      Then the registration succeeds
      And the compatibility check returns BACKWARD_TRANSITIVE COMPATIBLE

  # ─── Rollback: Flag Flip ──────────────────────────────────────────────────

  Scenario: Instant rollback — flag flip reverts to legacy path within 30 seconds
    Given the feature flag "cat.quantity.precision.v2" is ON
    And whole-share executions are processing correctly
    When the feature flag is flipped to OFF
    Then within 30 seconds new executions route to the legacy Long path
    And in-flight BigDecimal events already published are not affected
    And no data is lost
