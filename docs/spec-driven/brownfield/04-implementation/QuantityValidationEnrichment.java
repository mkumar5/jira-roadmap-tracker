package com.acme.trading.cat.enrichment;

import com.acme.trading.cat.ExecutionEvent;
import dev.openfeature.sdk.Client;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;

/**
 * Validates {@code executionQuantity} against risk limits.
 *
 * <p>Implements the strangler fig pattern: dispatches to the legacy Long path
 * or the new BigDecimal path based on the OpenFeature flag
 * {@code cat.quantity.precision.v2}.
 *
 * <p>When the flag is ON:
 * <ul>
 *   <li>Fractional quantities (e.g. 0.12345678) are accepted</li>
 *   <li>All validation uses {@link BigDecimal} — no {@code long} casting</li>
 *   <li>Notional = qty × price (exact BigDecimal multiply)</li>
 * </ul>
 *
 * <p>When the flag is OFF (default in prod until canary completes):
 * <ul>
 *   <li>Legacy Long path: fractional quantities throw {@link QuantityValidationException}</li>
 *   <li>Old behavior preserved — zero risk of regression</li>
 * </ul>
 *
 * <p>Stories: CAT-103, CAT-106
 * RFC: RFC-2026-014
 */
public class QuantityValidationEnrichment {

    private static final Logger log = LoggerFactory.getLogger(QuantityValidationEnrichment.class);

    private static final String FLAG_KEY = "cat.quantity.precision.v2";

    // v2 limits (BigDecimal)
    private static final BigDecimal MAX_QUANTITY = new BigDecimal("1000000.00000000");
    private static final BigDecimal MIN_QUANTITY = new BigDecimal("0.00000001"); // 1 nano-share

    // v1 limits (legacy)
    private static final long LEGACY_MAX_QUANTITY = 1_000_000L;
    private static final long LEGACY_MIN_QUANTITY = 1L;

    private final Client featureClient;

    public QuantityValidationEnrichment(Client featureClient) {
        this.featureClient = featureClient;
    }

    /**
     * Validates and enriches the execution event with quantity validation metadata.
     *
     * @param event the execution event to validate
     * @return the event (unchanged if valid — enrichment is additive)
     * @throws QuantityValidationException if quantity violates limits
     */
    public ExecutionEvent enrich(ExecutionEvent event) {
        boolean usePrecisionV2 = featureClient.getBooleanValue(FLAG_KEY, false);

        if (usePrecisionV2) {
            return validateBigDecimal(event);
        } else {
            return validateLegacy(event);
        }
    }

    // ─── v2 Path: BigDecimal ──────────────────────────────────────────────────

    private ExecutionEvent validateBigDecimal(ExecutionEvent event) {
        BigDecimal qty = event.executionQuantity();
        String execId  = event.executionId();

        // Positive check
        if (qty.compareTo(BigDecimal.ZERO) <= 0) {
            throw new QuantityValidationException(
                "executionQuantity must be positive, got: " + qty, execId);
        }

        // Minimum check (1 nano-share)
        if (qty.compareTo(MIN_QUANTITY) < 0) {
            throw new QuantityValidationException(
                "executionQuantity " + qty + " is below minimum reportable: " + MIN_QUANTITY, execId);
        }

        // Maximum check
        if (qty.compareTo(MAX_QUANTITY) > 0) {
            throw new QuantityValidationException(
                "executionQuantity " + qty + " exceeds maximum of " + MAX_QUANTITY, execId);
        }

        // Compute notional for downstream risk systems (exact BigDecimal)
        BigDecimal notional = event.notional();
        log.debug("v2 validated: executionId={} qty={} notional={}", execId, qty, notional);

        return event; // valid — return unchanged (enrichment is additive via withFees())
    }

    // ─── v1 Path: Legacy Long (strangler fig — to be deleted after canary) ────

    private ExecutionEvent validateLegacy(ExecutionEvent event) {
        BigDecimal qty = event.executionQuantity();
        String execId  = event.executionId();

        // Detect fractional on legacy path — reject with clear message
        if (qty.scale() > 0 && qty.stripTrailingZeros().scale() > 0) {
            BigDecimal fractionalPart = qty.subtract(new BigDecimal(qty.toBigInteger()));
            if (fractionalPart.compareTo(BigDecimal.ZERO) != 0) {
                log.warn("Fractional quantity rejected (flag off): executionId={} qty={}", execId, qty);
                throw new QuantityValidationException(
                    "Fractional quantity rejected: feature flag off. executionQuantity=" + qty, execId);
            }
        }

        long longQty = qty.longValueExact(); // throws if scale > 0 (extra safety net)

        if (longQty < LEGACY_MIN_QUANTITY) {
            throw new QuantityValidationException(
                "executionQuantity " + longQty + " below minimum " + LEGACY_MIN_QUANTITY, execId);
        }
        if (longQty > LEGACY_MAX_QUANTITY) {
            throw new QuantityValidationException(
                "executionQuantity " + longQty + " exceeds maximum " + LEGACY_MAX_QUANTITY, execId);
        }

        log.debug("v1 (legacy) validated: executionId={} qty={}", execId, longQty);
        return event;
    }
}
