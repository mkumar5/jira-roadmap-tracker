package com.acme.trading.cat.enrichment;

import com.acme.trading.cat.ExecutionEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Formats an enriched {@link ExecutionEvent} as a FINRA CAT JSON submission payload.
 *
 * <p>FINRA CAT Rule 613 formatting requirements:
 * <ul>
 *   <li>{@code executionQuantity}: plain decimal string, exactly 8 dp, NO scientific notation</li>
 *   <li>{@code executionPrice}: plain decimal string, exactly 4 dp</li>
 *   <li>{@code executedAt}: microsecond epoch (long), NOT ISO-8601 string</li>
 *   <li>No internal fields (schemaVersion, catReportingId, fees) in the submission payload</li>
 * </ul>
 *
 * <p><strong>Key regression:</strong> The old formatter called {@code BigDecimal.toString()}
 * which can produce scientific notation (e.g., {@code "1E-8"}) — rejected by FINRA's parser.
 * This formatter uses {@link BigDecimal#toPlainString()} exclusively.
 *
 * <p>Story: CAT-107
 */
public class CatSubmissionFormatter {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * Formats the execution event as a FINRA CAT JSON string.
     *
     * @param event fully enriched execution event
     * @return JSON string for FINRA CAT API submission
     */
    public String format(ExecutionEvent event) {
        ObjectNode node = MAPPER.createObjectNode();

        // Required FINRA CAT fields
        node.put("executionId",       event.executionId());
        node.put("orderId",           event.orderId());
        node.put("symbol",            event.symbol());
        node.put("side",              event.side().name());

        // Quantity: toPlainString() avoids scientific notation; 8dp enforced
        node.put("executionQuantity", formatDecimal(event.executionQuantity(), 8));

        // Price: 4dp
        node.put("executionPrice",    formatDecimal(event.executionPrice(), 4));

        node.put("currency",          event.currency());

        // Timestamp: microsecond epoch (FINRA requires sub-second precision)
        long micros = event.executedAt().getEpochSecond() * 1_000_000L
                    + event.executedAt().getNano() / 1_000L;
        node.put("executedAt", micros);

        if (event.venue() != null) {
            node.put("venue", event.venue());
        }

        try {
            return MAPPER.writeValueAsString(node);
        } catch (Exception e) {
            throw new CatFormattingException("Failed to serialize execution event: " + event.executionId(), e);
        }
    }

    /**
     * Converts a BigDecimal to a plain decimal string with the exact required scale.
     *
     * <p>Uses {@link BigDecimal#toPlainString()} to avoid scientific notation.
     * Scale is enforced with {@link RoundingMode#UNNECESSARY} — throws if precision would be lost.
     */
    private static String formatDecimal(BigDecimal value, int scale) {
        // setScale with UNNECESSARY throws ArithmeticException if rounding would be needed
        // This is intentional: the formatter should never silently round FINRA values
        return value.setScale(scale, RoundingMode.UNNECESSARY).toPlainString();
    }
}
