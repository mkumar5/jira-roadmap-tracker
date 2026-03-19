package com.acme.trading.cat.enrichment;

import com.acme.trading.cat.ExecutionEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * AS-IS (v1): Validates execution quantity against risk limits.
 *
 * <p>This is the BEFORE state of the enrichment pipeline.
 * Issue: validates {@code long} quantity — cannot handle fractional shares.
 *
 * @deprecated See 04-implementation/QuantityValidationEnrichment.java for the v2 version
 */
@Deprecated(since = "2026-03-01", forRemoval = true)
public class QuantityValidationEnrichment {

    private static final Logger log = LoggerFactory.getLogger(QuantityValidationEnrichment.class);

    // Risk limits (in whole shares)
    private static final long MAX_SINGLE_ORDER_QTY  = 1_000_000L; // 1M shares
    private static final long MIN_REPORTABLE_QTY    = 1L;          // 1 share minimum

    /**
     * Validates quantity and annotates the event with risk metadata.
     *
     * @param event the raw execution event
     * @return enriched event with validation metadata in the headers
     * @throws QuantityValidationException if quantity violates risk limits
     */
    public ExecutionEvent enrich(ExecutionEvent event) {
        long qty = event.executionQuantity();

        // BUG: MIN_REPORTABLE_QTY = 1 rejects all fractional shares (0.12345678 → 0 as long)
        if (qty < MIN_REPORTABLE_QTY) {
            log.error("Rejected: quantity {} below minimum reportable threshold for executionId={}",
                qty, event.executionId());
            throw new QuantityValidationException(
                "executionQuantity " + qty + " is below minimum reportable quantity of " + MIN_REPORTABLE_QTY,
                event.executionId()
            );
        }

        if (qty > MAX_SINGLE_ORDER_QTY) {
            log.error("Rejected: quantity {} exceeds max single order limit for executionId={}",
                qty, event.executionId());
            throw new QuantityValidationException(
                "executionQuantity " + qty + " exceeds maximum of " + MAX_SINGLE_ORDER_QTY,
                event.executionId()
            );
        }

        // Compute notional (in basis points to avoid float)
        // BUG: price stored as basis points but quantity as whole shares — notional formula wrong
        long notionalBps = qty * event.executionPrice();
        log.debug("Validated: executionId={} qty={} notionalBps={}",
            event.executionId(), qty, notionalBps);

        return event; // AS-IS: returns same event (no mutation pattern)
    }
}
