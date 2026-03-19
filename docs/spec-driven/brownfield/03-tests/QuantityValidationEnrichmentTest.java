package com.acme.trading.cat.enrichment;

import com.acme.trading.cat.ExecutionEvent;
import com.acme.trading.cat.ExecutionSide;
import dev.openfeature.sdk.Client;
import dev.openfeature.sdk.OpenFeatureAPI;
import dev.openfeature.sdk.providers.memory.Flag;
import dev.openfeature.sdk.providers.memory.InMemoryProvider;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;

/**
 * CAT-103: Unit tests for QuantityValidationEnrichment (v2 — BigDecimal path).
 *
 * TDD: Tests written BEFORE the implementation.
 * These tests define the contract — the implementation must satisfy them.
 *
 * Feature flag: cat.quantity.precision.v2
 */
class QuantityValidationEnrichmentTest {

    private Client featureClient;
    private QuantityValidationEnrichment enrichment;

    // ─── Test Fixtures ────────────────────────────────────────────────────────

    private static ExecutionEvent sampleEvent(String quantity) {
        return new ExecutionEvent(
            "EX-20260301-0042",
            "ORD-2026-0001",
            "AAPL",
            ExecutionSide.BUY,
            new BigDecimal(quantity),
            new BigDecimal("182.3400"),
            "USD",
            Instant.parse("2026-03-01T14:30:00.000000Z"),
            "XNAS"
        );
    }

    @BeforeEach
    void setUp() {
        // In-memory OpenFeature provider — no external LaunchDarkly in unit tests
        var flags = Map.of(
            "cat.quantity.precision.v2",
            Flag.<Boolean>builder()
                .variant("on", true)
                .variant("off", false)
                .defaultVariant("off")
                .build()
        );
        OpenFeatureAPI.getInstance().setProvider(new InMemoryProvider(flags));
        featureClient = OpenFeatureAPI.getInstance().getClient();
        enrichment = new QuantityValidationEnrichment(featureClient);
    }

    // ─── Flag OFF: Legacy path ────────────────────────────────────────────────

    @Nested
    @DisplayName("Feature flag OFF — legacy Long path")
    class FlagOff {

        @BeforeEach
        void disableFlag() {
            featureClient.getBooleanValue("cat.quantity.precision.v2", false);
            // InMemoryProvider defaults to "off" variant = false
        }

        @Test
        @DisplayName("Whole-share quantity accepted on legacy path")
        void givenWholeShare_whenFlagOff_thenAccepted() {
            ExecutionEvent event = sampleEvent("100.00000000");
            assertThatNoException().isThrownBy(() -> enrichment.enrich(event));
        }

        @Test
        @DisplayName("Fractional quantity rejected on legacy path")
        void givenFractionalQty_whenFlagOff_thenRejected() {
            ExecutionEvent event = sampleEvent("0.12345678");
            assertThatThrownBy(() -> enrichment.enrich(event))
                .isInstanceOf(QuantityValidationException.class)
                .hasMessageContaining("Fractional quantity rejected: feature flag off");
        }
    }

    // ─── Flag ON: BigDecimal path ─────────────────────────────────────────────

    @Nested
    @DisplayName("Feature flag ON — BigDecimal path")
    class FlagOn {

        @BeforeEach
        void enableFlag() {
            // Override default to "on"
            OpenFeatureAPI.getInstance().setProvider(
                new InMemoryProvider(Map.of(
                    "cat.quantity.precision.v2",
                    Flag.<Boolean>builder()
                        .variant("on", true)
                        .variant("off", false)
                        .defaultVariant("on") // flag is ON
                        .build()
                ))
            );
        }

        @ParameterizedTest(name = "quantity={0} is valid")
        @CsvSource({
            "100.00000000",   // whole shares
            "0.12345678",     // fractional
            "0.00000001",     // minimum fractional (1 nano-share)
            "999999.99999999" // near max
        })
        @DisplayName("Valid quantities are accepted")
        void givenValidQty_whenFlagOn_thenAccepted(String quantity) {
            ExecutionEvent event = sampleEvent(quantity);
            assertThatNoException().isThrownBy(() -> enrichment.enrich(event));
        }

        @Test
        @DisplayName("Enriched event preserves 8-decimal precision")
        void givenFractionalQty_whenEnriched_thenScalePreserved() {
            ExecutionEvent event = sampleEvent("0.12345678");
            ExecutionEvent enriched = enrichment.enrich(event);
            assertThat(enriched.executionQuantity().scale()).isEqualTo(8);
            assertThat(enriched.executionQuantity()).isEqualByComparingTo(new BigDecimal("0.12345678"));
        }

        @Test
        @DisplayName("Zero quantity rejected")
        void givenZeroQty_whenFlagOn_thenRejected() {
            ExecutionEvent event = sampleEvent("0.00000000");
            assertThatThrownBy(() -> enrichment.enrich(event))
                .isInstanceOf(QuantityValidationException.class)
                .hasMessageContaining("executionQuantity must be positive");
        }

        @Test
        @DisplayName("Negative quantity rejected")
        void givenNegativeQty_whenFlagOn_thenRejected() {
            ExecutionEvent event = sampleEvent("-1.00000000");
            assertThatThrownBy(() -> enrichment.enrich(event))
                .isInstanceOf(QuantityValidationException.class)
                .hasMessageContaining("executionQuantity must be positive");
        }

        @Test
        @DisplayName("Quantity exceeding limit rejected")
        void givenExcessiveQty_whenFlagOn_thenRejected() {
            ExecutionEvent event = sampleEvent("1000001.00000000");
            assertThatThrownBy(() -> enrichment.enrich(event))
                .isInstanceOf(QuantityValidationException.class)
                .hasMessageContaining("exceeds maximum");
        }

        @Test
        @DisplayName("Notional value computed with exact BigDecimal arithmetic")
        void givenFractionalQtyAndPrice_whenEnriched_thenNotionalIsExact() {
            // 0.12345678 × 182.3400 = 22.5047979972 exactly
            BigDecimal expectedNotional = new BigDecimal("22.5047979972");
            ExecutionEvent event = new ExecutionEvent(
                "EX-TEST-001", "ORD-TEST", "AAPL", ExecutionSide.BUY,
                new BigDecimal("0.12345678"),
                new BigDecimal("182.3400"),
                "USD", Instant.now(), "XNAS"
            );
            ExecutionEvent enriched = enrichment.enrich(event);
            // Notional stored in event metadata for risk systems
            assertThat(enriched.notional()).isEqualByComparingTo(expectedNotional);
        }
    }
}
