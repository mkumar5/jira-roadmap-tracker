package com.acme.trading.cat;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Objects;

/**
 * FINRA CAT execution event domain object — v2 (BigDecimal quantity).
 *
 * <p>Migration from v1 ({@code long executionQuantity}) to v2 ({@code BigDecimal executionQuantity})
 * per RFC-2026-014 to support fractional share precision required by FINRA CAT Rule 613 Amendment.
 *
 * <p><strong>Key invariants:</strong>
 * <ul>
 *   <li>{@code executionQuantity} — scale=8, strictly positive, max 1,000,000 shares</li>
 *   <li>{@code executionPrice} — scale=4, strictly positive</li>
 *   <li>No {@code double} or {@code float} used anywhere in this class (ADR-007)</li>
 * </ul>
 *
 * <p>Story: CAT-101, CAT-102
 */
public record ExecutionEvent(
    String executionId,
    String orderId,
    String symbol,
    ExecutionSide side,
    BigDecimal executionQuantity,  // ← Changed from long to BigDecimal (scale=8)
    BigDecimal executionPrice,     // ← Changed from long (basis pts) to BigDecimal (scale=4)
    String currency,
    Instant executedAt,
    String venue
) {

    // Canonical constructor — validation and normalization
    public ExecutionEvent {
        Objects.requireNonNull(executionId, "executionId");
        Objects.requireNonNull(orderId, "orderId");
        Objects.requireNonNull(symbol, "symbol");
        Objects.requireNonNull(side, "side");
        Objects.requireNonNull(executedAt, "executedAt");

        // Enforce scale — throws ArithmeticException if precision would be lost
        executionQuantity = Objects.requireNonNull(executionQuantity, "executionQuantity")
            .setScale(8, RoundingMode.UNNECESSARY);
        executionPrice = Objects.requireNonNull(executionPrice, "executionPrice")
            .setScale(4, RoundingMode.UNNECESSARY);

        currency = currency != null ? currency : "USD";
    }

    // ─── Derived values ───────────────────────────────────────────────────────

    /**
     * Gross notional value: quantity × price.
     * Scale=12 to avoid intermediate rounding during downstream computation.
     * No floating-point involved.
     */
    public BigDecimal notional() {
        return executionQuantity.multiply(executionPrice)
                                .setScale(12, RoundingMode.HALF_EVEN);
    }

    /**
     * @return true if this is a sell-side execution (used for SEC fee applicability)
     */
    public boolean isSell() {
        return side == ExecutionSide.SELL || side == ExecutionSide.SELL_SHORT;
    }

    // ─── Fee fields (added by FeeCalculationEnrichment) ──────────────────────
    // Note: these are set via withFees() builder pattern, not in the record constructor
    // to keep this record immutable and free of enrichment logic.

    private BigDecimal _secFee;
    private BigDecimal _finraTaf;

    /** Returns the SEC fee computed by FeeCalculationEnrichment, or null if not yet enriched. */
    public BigDecimal secFee()   { return _secFee; }
    public BigDecimal finraTaf() { return _finraTaf; }

    /**
     * Returns a copy of this event with fee fields populated.
     * Used by FeeCalculationEnrichment to produce an immutable enriched event.
     */
    public ExecutionEvent withFees(BigDecimal secFee, BigDecimal finraTaf) {
        ExecutionEvent copy = new ExecutionEvent(
            executionId, orderId, symbol, side,
            executionQuantity, executionPrice, currency, executedAt, venue
        );
        copy._secFee   = secFee;
        copy._finraTaf = finraTaf;
        return copy;
    }

    // ─── Factory ──────────────────────────────────────────────────────────────

    /**
     * Creates an ExecutionEvent from raw string values (e.g., parsed from CSV/JSON).
     * Validates scale at parse time.
     */
    public static ExecutionEvent of(
            String executionId, String orderId, String symbol,
            ExecutionSide side,
            String quantity,  // e.g. "0.12345678"
            String price,     // e.g. "182.3400"
            String currency, Instant executedAt, String venue) {
        return new ExecutionEvent(
            executionId, orderId, symbol, side,
            new BigDecimal(quantity),
            new BigDecimal(price),
            currency, executedAt, venue
        );
    }

    @Override
    public String toString() {
        return "ExecutionEvent{" +
               "executionId='" + executionId + '\'' +
               ", symbol='" + symbol + '\'' +
               ", side=" + side +
               ", qty=" + executionQuantity +
               ", price=" + executionPrice +
               ", executedAt=" + executedAt +
               '}';
    }
}
