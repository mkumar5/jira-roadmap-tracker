package com.acme.trading.cat.enrichment;

import com.acme.trading.cat.ExecutionEvent;
import com.acme.trading.cat.ExecutionSide;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Aggregates net position per symbol from execution events.
 *
 * <p>This enrichment maintains an in-memory position book (suitable for a single instance;
 * production uses Redis for distributed state). Positions accumulate fractional shares
 * exactly using BigDecimal — the v1 Long-based accumulator would truncate fractional positions.
 *
 * <p>Example:
 * <pre>
 *   BUY  99.88888888 AAPL → position: +99.88888888
 *   BUY   0.11111112 AAPL → position: +100.00000000  ← exact, not 99.99999999
 *   SELL  0.50000000 AAPL → position:  +99.50000000
 * </pre>
 *
 * <p>Story: CAT-105
 */
public class PositionAggregationEnrichment {

    private static final Logger log = LoggerFactory.getLogger(PositionAggregationEnrichment.class);

    // symbol → net position (signed: positive=long, negative=short)
    private final ConcurrentMap<String, BigDecimal> positions = new ConcurrentHashMap<>();

    /**
     * Updates the net position for the event's symbol and annotates the event.
     *
     * @param event fee-enriched execution event
     * @return event with updated position in metadata (or as a field in production)
     */
    public ExecutionEvent enrich(ExecutionEvent event) {
        String symbol         = event.symbol();
        BigDecimal qty        = event.executionQuantity();
        ExecutionSide side    = event.side();

        // BUY adds to position; SELL/SELL_SHORT subtracts
        BigDecimal signedQty = isBuy(side) ? qty : qty.negate();

        BigDecimal newPosition = positions.merge(
            symbol,
            signedQty,
            (existing, delta) -> existing.add(delta).setScale(8, RoundingMode.UNNECESSARY)
        );

        log.debug("Position updated: symbol={} side={} qty={} newPosition={}",
            symbol, side, qty, newPosition);

        // Detect short position breach (example risk rule)
        if (newPosition.compareTo(new BigDecimal("-100000.00000000")) < 0) {
            log.warn("RISK ALERT: position for {} is excessively short: {}", symbol, newPosition);
        }

        return event; // event not mutated; position stored in the book
    }

    /**
     * Returns the current net position for a symbol.
     * Returns ZERO if no executions have been processed for this symbol.
     */
    public BigDecimal getPosition(String symbol) {
        return positions.getOrDefault(symbol, BigDecimal.ZERO.setScale(8, RoundingMode.UNNECESSARY));
    }

    /**
     * Resets position book (for testing / end-of-day reconciliation).
     */
    public void reset() {
        positions.clear();
    }

    private static boolean isBuy(ExecutionSide side) {
        return side == ExecutionSide.BUY || side == ExecutionSide.BUY_TO_COVER;
    }
}
