package com.acme.trading.cat;

/**
 * AS-IS (v1): Execution event domain object.
 *
 * <p>WARNING: This class is the BEFORE state — shown here for brownfield
 * comparison. The actual production class has been migrated to v2.
 * See {@code 04-implementation/ExecutionEvent.java} for the current state.
 *
 * <p>Issue: {@code executionQuantity} is stored as {@code long} — whole shares only.
 * FINRA CAT Amendment (effective 2026-04-01) requires Decimal(18,8).
 *
 * @deprecated Replaced by BigDecimal-based ExecutionEvent — see RFC-2026-014
 */
@Deprecated(since = "2026-03-01", forRemoval = true)
public record ExecutionEvent(
    String executionId,           // e.g. "EX-20260301-0042"
    String orderId,               // e.g. "ORD-2026-0001"
    String symbol,                // e.g. "AAPL"
    String side,                  // "BUY" | "SELL"
    long executionQuantity,       // ← PROBLEM: whole shares only (e.g. 100)
    long executionPrice,          // price in basis points (e.g. 182_3400 = $182.34)
    String currency,              // "USD"
    long executedAtEpochMicros,   // UTC timestamp
    String venue                  // MIC code, e.g. "XNAS"
) {

    /**
     * Legacy helper: quantity as double for display ONLY.
     * Do NOT use for arithmetic — see ADR-007.
     */
    public double quantityAsDouble() {
        return (double) executionQuantity;
    }

    /**
     * Legacy fee calculation: qty × rate in basis points.
     * BUG: fractional shares produce wrong fee when qty < 1.
     */
    public long legacyFeeInBasisPoints(long ratePerShareBps) {
        return executionQuantity * ratePerShareBps; // integer multiply — truncates fractions!
    }
}
