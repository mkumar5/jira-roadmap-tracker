package com.acme.trading.cat.enrichment;

import com.acme.trading.cat.ExecutionEvent;
import com.acme.trading.cat.ExecutionSide;
import org.junit.jupiter.api.*;

import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.*;

/**
 * CAT-105: Unit tests for CatSubmissionFormatter.
 *
 * FINRA CAT Rule 613 requires:
 * - executionQuantity serialized as decimal string with exactly 8 decimal places
 * - No scientific notation (1.2345678E-2 is rejected by FINRA)
 * - Timestamp in microseconds (not milliseconds)
 */
class CatSubmissionFormatterTest {

    private CatSubmissionFormatter formatter;

    @BeforeEach
    void setUp() {
        formatter = new CatSubmissionFormatter();
    }

    // ─── Quantity Serialization ────────────────────────────────────────────────

    @Test
    @DisplayName("Fractional quantity serialized with 8 decimal places, no scientific notation")
    void givenFractionalQty_whenFormatted_thenExactDecimalString() {
        ExecutionEvent event = buildEvent("0.12345678", "182.3400");
        String catPayload = formatter.format(event);

        assertThat(catPayload).contains("\"executionQuantity\":\"0.12345678\"");
        // NOT "1.2345678E-1" (scientific notation rejected by FINRA)
        assertThat(catPayload).doesNotContain("E-");
        assertThat(catPayload).doesNotContain("e-");
    }

    @Test
    @DisplayName("Whole-share quantity serialized with trailing zeros to 8 dp")
    void givenWholeShare_whenFormatted_thenTrailingZeros() {
        ExecutionEvent event = buildEvent("100.00000000", "182.3400");
        String catPayload = formatter.format(event);
        // FINRA requires 8dp even for whole shares
        assertThat(catPayload).contains("\"executionQuantity\":\"100.00000000\"");
        assertThat(catPayload).doesNotContain("\"executionQuantity\":\"100\"");
    }

    @Test
    @DisplayName("Minimum fractional share (1 nano-share) serialized correctly")
    void givenMinimumFractional_whenFormatted_thenCorrect() {
        ExecutionEvent event = buildEvent("0.00000001", "182.3400");
        String catPayload = formatter.format(event);
        assertThat(catPayload).contains("\"executionQuantity\":\"0.00000001\"");
    }

    // ─── Timestamp Serialization ───────────────────────────────────────────────

    @Test
    @DisplayName("executedAt serialized in microseconds (not milliseconds)")
    void givenExecutedAt_whenFormatted_thenMicroseconds() {
        Instant ts = Instant.parse("2026-03-01T14:30:00.123456Z");
        ExecutionEvent event = new ExecutionEvent(
            "EX-TS-001", "ORD-001", "AAPL", ExecutionSide.BUY,
            new BigDecimal("100.00000000"),
            new BigDecimal("182.3400"),
            "USD",
            ts,
            "XNAS"
        );
        String catPayload = formatter.format(event);
        // FINRA CAT expects microsecond epoch: 2026-03-01T14:30:00.123456Z = ?
        long expectedMicros = ts.getEpochSecond() * 1_000_000L + ts.getNano() / 1_000L;
        assertThat(catPayload).contains("\"executedAt\":" + expectedMicros);
    }

    // ─── Required FINRA Fields ─────────────────────────────────────────────────

    @Test
    @DisplayName("CAT payload contains all required FINRA fields")
    void givenValidEvent_whenFormatted_thenAllRequiredFieldsPresent() {
        ExecutionEvent event = buildEvent("100.00000000", "182.3400");
        String catPayload = formatter.format(event);

        // All fields required by FINRA CAT Rule 613
        assertThat(catPayload).contains("\"executionId\"");
        assertThat(catPayload).contains("\"orderId\"");
        assertThat(catPayload).contains("\"symbol\"");
        assertThat(catPayload).contains("\"side\"");
        assertThat(catPayload).contains("\"executionQuantity\"");
        assertThat(catPayload).contains("\"executionPrice\"");
        assertThat(catPayload).contains("\"executedAt\"");
        assertThat(catPayload).contains("\"currency\"");
    }

    @Test
    @DisplayName("CAT payload does NOT include internal fields (catReportingId, schemaVersion)")
    void givenEvent_whenFormatted_thenInternalFieldsOmitted() {
        ExecutionEvent event = buildEvent("100.00000000", "182.3400");
        String catPayload = formatter.format(event);
        // Internal fields must not leak into FINRA submission
        assertThat(catPayload).doesNotContain("\"schemaVersion\"");
        assertThat(catPayload).doesNotContain("\"catReportingId\"");
    }

    // ─── Regression: Old formatter used toString() on BigDecimal ─────────────

    @Test
    @DisplayName("REGRESSION: BigDecimal.toString() can produce scientific notation — formatter must use toPlainString()")
    void givenVerySmallQty_thenNoScientificNotation() {
        // BigDecimal("1E-8").toString() = "1E-8" (breaks FINRA parser)
        // BigDecimal("1E-8").toPlainString() = "0.00000001" (correct)
        BigDecimal trickyQty = new BigDecimal("1E-8"); // same as 0.00000001 but different representation
        ExecutionEvent event = new ExecutionEvent(
            "EX-REGEX-001", "ORD-001", "TSLA", ExecutionSide.BUY,
            trickyQty.setScale(8, java.math.RoundingMode.UNNECESSARY),
            new BigDecimal("198.7500"),
            "USD", Instant.now(), "XNAS"
        );
        String catPayload = formatter.format(event);
        assertThat(catPayload).contains("\"executionQuantity\":\"0.00000001\"");
        assertThat(catPayload).doesNotContain("E-8");
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private static ExecutionEvent buildEvent(String qty, String price) {
        return new ExecutionEvent(
            "EX-20260301-0042", "ORD-2026-0001", "AAPL",
            ExecutionSide.BUY,
            new BigDecimal(qty),
            new BigDecimal(price),
            "USD",
            Instant.parse("2026-03-01T14:30:00.000000Z"),
            "XNAS"
        );
    }
}
