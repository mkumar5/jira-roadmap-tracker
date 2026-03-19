package com.acme.trading.cat.enrichment;

import com.acme.trading.cat.ExecutionEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Computes regulatory fees for FINRA CAT executions.
 *
 * <p>Fees computed:
 * <ul>
 *   <li><b>SEC Fee</b> (Section 31): notional × rate; SELL side only</li>
 *   <li><b>FINRA TAF</b> (Trading Activity Fee): shares × rate; both sides</li>
 * </ul>
 *
 * <p><strong>No double/float allowed.</strong> All arithmetic uses {@link BigDecimal}
 * with explicit {@link RoundingMode}. This is enforced by ADR-007 and the
 * pre-commit hook {@code scripts/check-no-float-in-fees.sh}.
 *
 * <p>Stories: CAT-104
 */
public class FeeCalculationEnrichment {

    private static final Logger log = LoggerFactory.getLogger(FeeCalculationEnrichment.class);

    private static final int FEE_SCALE = 8; // FINRA requires up to 8dp on fee fields

    private final BigDecimal secFeeRate;   // e.g. 0.00000278 per $1 notional (SELL only)
    private final BigDecimal finraTafRate; // e.g. 0.000166 per share
    private final BigDecimal exchangeRebateRate; // e.g. 0.0020 per share (maker credit)

    public FeeCalculationEnrichment(
            BigDecimal secFeeRate,
            BigDecimal finraTafRate,
            BigDecimal exchangeRebateRate) {
        this.secFeeRate          = secFeeRate;
        this.finraTafRate        = finraTafRate;
        this.exchangeRebateRate  = exchangeRebateRate;
    }

    /**
     * Enriches the event with computed fee fields.
     *
     * @param event validated execution event (must have passed QuantityValidationEnrichment)
     * @return new event with secFee and finraTaf populated
     */
    public ExecutionEvent enrich(ExecutionEvent event) {
        BigDecimal qty      = event.executionQuantity();
        BigDecimal notional = event.notional();

        // SEC Fee: only on SELL executions; on gross notional
        BigDecimal secFee = event.isSell()
            ? notional.multiply(secFeeRate).setScale(FEE_SCALE, RoundingMode.HALF_UP)
            : BigDecimal.ZERO.setScale(FEE_SCALE, RoundingMode.UNNECESSARY);

        // FINRA TAF: per share (fractional shares get fractional TAF — this was the bug in v1)
        BigDecimal finraTaf = qty.multiply(finraTafRate)
                                  .setScale(FEE_SCALE, RoundingMode.HALF_UP);

        log.debug("Fees computed: executionId={} secFee={} finraTaf={}",
            event.executionId(), secFee, finraTaf);

        // Return new immutable event with fees attached
        return event.withFees(secFee, finraTaf);
    }
}
