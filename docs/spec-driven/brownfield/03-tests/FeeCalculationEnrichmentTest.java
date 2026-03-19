package com.acme.trading.cat.enrichment;

import com.acme.trading.cat.ExecutionEvent;
import com.acme.trading.cat.ExecutionSide;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;

/**
 * CAT-104: Unit tests for FeeCalculationEnrichment.
 *
 * Critical regression tests: the old implementation used long × long arithmetic
 * which produced WRONG fees for fractional shares. These tests codify the correct
 * behavior using BigDecimal.
 *
 * Key principle: no double/float in fee calculation — use BigDecimal throughout.
 */
class FeeCalculationEnrichmentTest {

    private FeeCalculationEnrichment enrichment;

    // Fee rates (BigDecimal, not double)
    private static final BigDecimal SEC_FEE_RATE         = new BigDecimal("0.00000278"); // $0.00000278 per $1 notional
    private static final BigDecimal FINRA_TAF_RATE       = new BigDecimal("0.000166");   // $0.000166 per share
    private static final BigDecimal EXCHANGE_REBATE_RATE = new BigDecimal("0.0020");     // $0.0020 per share (credit on maker)

    @BeforeEach
    void setUp() {
        enrichment = new FeeCalculationEnrichment(SEC_FEE_RATE, FINRA_TAF_RATE, EXCHANGE_REBATE_RATE);
    }

    // ─── Regression: Old long arithmetic produced wrong results ──────────────

    @Test
    @DisplayName("REGRESSION: Fractional shares — old long arithmetic would give WRONG fee")
    void givenFractionalShare_thenFeeIsExact_notTruncated() {
        // Old code: fee = (long)qty × rate_bps / 10000 → qty=0 for fractional → fee=0 (WRONG!)
        // New code: fee = BigDecimal qty × BigDecimal rate → exact result

        BigDecimal qty   = new BigDecimal("0.50000000");
        BigDecimal price = new BigDecimal("182.3400");
        BigDecimal finraTaf = qty.multiply(FINRA_TAF_RATE); // 0.5 × 0.000166 = 0.000083

        ExecutionEvent event = buildEvent("EX-FEE-001", qty, price, ExecutionSide.BUY);
        ExecutionEvent enriched = enrichment.enrich(event);

        // FINRA TAF = qty × FINRA_TAF_RATE
        assertThat(enriched.finraTaf())
            .isEqualByComparingTo(new BigDecimal("0.00008300"));

        // Prove the old way was wrong
        long oldQtyLong = qty.longValue(); // = 0 (truncated!)
        assertThat(oldQtyLong).isEqualTo(0L);
        // Old fee would have been 0 × 0.000166 = 0 → WRONG, should be 0.000083
    }

    // ─── Parameterized: Various quantities ───────────────────────────────────

    static Stream<Arguments> feeScenarios() {
        return Stream.of(
            // qty,            price,       expected FINRA TAF
            Arguments.of("100.00000000",  "182.3400",  "0.01660000"),  // 100 × 0.000166
            Arguments.of("0.50000000",    "182.3400",  "0.00008300"),  // 0.5 × 0.000166
            Arguments.of("0.12345678",    "182.3400",  "0.00002049"),  // 0.12345678 × 0.000166 ≈ 0.00002049
            Arguments.of("1000.00000000", "50.0000",   "0.16600000"),  // 1000 × 0.000166
            Arguments.of("0.00000001",    "182.3400",  "0.00000000")   // sub-nano — rounds to 0
        );
    }

    @ParameterizedTest(name = "qty={0} price={1} → FINRA TAF={2}")
    @MethodSource("feeScenarios")
    @DisplayName("FINRA TAF calculated correctly for various quantities")
    void givenQtyAndPrice_thenFinraTafIsCorrect(String qty, String price, String expectedTaf) {
        ExecutionEvent event = buildEvent("EX-FEE-PARAM", new BigDecimal(qty), new BigDecimal(price), ExecutionSide.BUY);
        ExecutionEvent enriched = enrichment.enrich(event);
        assertThat(enriched.finraTaf()).isEqualByComparingTo(new BigDecimal(expectedTaf));
    }

    // ─── SEC Fee ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("SEC fee computed on notional, not per-share")
    void givenExecution_thenSecFeeOnNotional() {
        // SEC fee = notional × SEC_FEE_RATE
        // Notional = 100 shares × $182.34 = $18,234.00
        // SEC fee = $18,234.00 × 0.00000278 = $0.05069052
        BigDecimal qty = new BigDecimal("100.00000000");
        BigDecimal price = new BigDecimal("182.3400");
        BigDecimal expectedSecFee = new BigDecimal("0.05069052");

        ExecutionEvent event = buildEvent("EX-SEC-001", qty, price, ExecutionSide.SELL);
        ExecutionEvent enriched = enrichment.enrich(event);
        assertThat(enriched.secFee()).isEqualByComparingTo(expectedSecFee);
    }

    @Test
    @DisplayName("SEC fee only applies to SELL side (not BUY)")
    void givenBuyExecution_thenSecFeeIsZero() {
        ExecutionEvent event = buildEvent("EX-SEC-BUY",
            new BigDecimal("100.00000000"),
            new BigDecimal("182.3400"),
            ExecutionSide.BUY);
        ExecutionEvent enriched = enrichment.enrich(event);
        assertThat(enriched.secFee()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    // ─── No Float/Double Leak ─────────────────────────────────────────────────

    @Test
    @DisplayName("No double arithmetic in fee path — BigDecimal throughout")
    void givenFractionalQty_thenNoFloatingPointErrors() {
        // Classic float trap: 0.1 + 0.2 ≠ 0.3 in IEEE 754
        // Verify our fee computation is immune
        BigDecimal qty   = new BigDecimal("0.10000000")
            .add(new BigDecimal("0.20000000")); // = 0.30000000 exactly

        ExecutionEvent event = buildEvent("EX-FLOAT-TRAP",
            qty, new BigDecimal("100.0000"), ExecutionSide.BUY);
        ExecutionEvent enriched = enrichment.enrich(event);

        // FINRA TAF: 0.3 × 0.000166 = 0.0000498
        assertThat(enriched.finraTaf())
            .isEqualByComparingTo(new BigDecimal("0.00004980"));
        // If double was used: 0.1 + 0.2 = 0.30000000000000004 → wrong fee
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private static ExecutionEvent buildEvent(String execId, BigDecimal qty, BigDecimal price, ExecutionSide side) {
        return new ExecutionEvent(execId, "ORD-TEST", "AAPL", side, qty, price, "USD", Instant.now(), "XNAS");
    }
}
