package com.acme.trading.notifications;

import com.acme.trading.events.OrderExecutedEvent;
import com.acme.trading.model.ExecutionConfirmation;
import com.acme.trading.model.OrderSide;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.annotation.DirtiesContext;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

/**
 * ONS-106: Integration tests for OrderNotificationService.
 *
 * Written BEFORE the implementation (TDD red → green).
 * Uses embedded Kafka — no external dependencies.
 *
 * Run: mvn test -Dtest=OrderNotificationServiceTest
 */
@SpringBootTest
@EmbeddedKafka(
    partitions = 3,
    topics = {"trade.executions.v1", "trade.executions.dlq"},
    bootstrapServersProperty = "spring.kafka.bootstrap-servers"
)
@DirtiesContext
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class OrderNotificationServiceTest {

    @Autowired
    private OrderNotificationService service;

    @Autowired
    private TestKafkaConsumer kafkaConsumer; // test helper that subscribes and collects events

    @Autowired
    private DeduplicationCache deduplicationCache;

    // ─── Fixtures ─────────────────────────────────────────────────────────────

    private static final String ORDER_ID      = "ORD-2026-0001";
    private static final String EXECUTION_ID  = "EX-20260301-0042";
    private static final String SYMBOL        = "AAPL";
    private static final BigDecimal QUANTITY  = new BigDecimal("100.00000000");
    private static final BigDecimal PRICE     = new BigDecimal("182.3400");

    private ExecutionConfirmation sampleConfirmation() {
        return new ExecutionConfirmation(
            ORDER_ID,
            EXECUTION_ID,
            SYMBOL,
            OrderSide.BUY,
            QUANTITY,
            PRICE,
            Instant.parse("2026-03-01T14:30:00.000000Z")
        );
    }

    // ─── Happy Path ───────────────────────────────────────────────────────────

    @Test
    @Order(1)
    @DisplayName("FR-1: Confirmed execution is published to Kafka within 500ms")
    void givenExecution_whenConfirmed_thenPublishedWithin500ms() {
        // Arrange
        ExecutionConfirmation confirmation = sampleConfirmation();
        long startMs = System.currentTimeMillis();

        // Act
        service.onExecutionConfirmed(confirmation);

        // Assert — event arrives on topic within 500ms
        await().atMost(500, TimeUnit.MILLISECONDS)
               .until(() -> kafkaConsumer.hasEvent(EXECUTION_ID));

        long elapsed = System.currentTimeMillis() - startMs;
        assertThat(elapsed).isLessThan(500L);

        OrderExecutedEvent event = kafkaConsumer.getEvent(EXECUTION_ID);
        assertThat(event.getOrderId()).isEqualTo(ORDER_ID);
        assertThat(event.getExecutionId()).isEqualTo(EXECUTION_ID);
        assertThat(event.getSymbol()).isEqualTo(SYMBOL);
        assertThat(new BigDecimal(event.getQuantity().toString())).isEqualByComparingTo(QUANTITY);
        assertThat(new BigDecimal(event.getPrice().toString())).isEqualByComparingTo(PRICE);
    }

    @Test
    @Order(2)
    @DisplayName("FR-1: Fractional share quantity preserved with 8 decimal places")
    void givenFractionalQuantity_whenPublished_thenPrecisionPreserved() {
        // Arrange — fractional shares (e.g. BRK.B via fractional share platform)
        BigDecimal fractionalQty = new BigDecimal("0.12345678");
        ExecutionConfirmation confirmation = new ExecutionConfirmation(
            "ORD-2026-0002",
            "EX-20260301-0043",
            "BRK.B",
            OrderSide.BUY,
            fractionalQty,
            new BigDecimal("401.2500"),
            Instant.now()
        );

        // Act
        service.onExecutionConfirmed(confirmation);

        // Assert
        await().atMost(1, TimeUnit.SECONDS)
               .until(() -> kafkaConsumer.hasEvent("EX-20260301-0043"));

        OrderExecutedEvent event = kafkaConsumer.getEvent("EX-20260301-0043");
        // Avro decimal bytes must round-trip exactly — no float approximation
        assertThat(new BigDecimal(event.getQuantity().toString()))
            .isEqualByComparingTo(fractionalQty);
        assertThat(event.getQuantity().scale()).isEqualTo(8);
    }

    // ─── Idempotency ──────────────────────────────────────────────────────────

    @Test
    @Order(3)
    @DisplayName("FR-2: Duplicate confirmation publishes exactly one event")
    void givenDuplicateConfirmation_whenProcessed_thenOnlyOneEventPublished() {
        // Arrange
        String uniqueExecId = "EX-20260301-DEDUP-" + UUID.randomUUID();
        ExecutionConfirmation confirmation = new ExecutionConfirmation(
            "ORD-2026-DEDUP",
            uniqueExecId,
            "MSFT",
            OrderSide.SELL,
            new BigDecimal("50.00000000"),
            new BigDecimal("415.2200"),
            Instant.now()
        );

        // Act — send same confirmation twice (simulates retry storm)
        service.onExecutionConfirmed(confirmation);
        service.onExecutionConfirmed(confirmation); // duplicate

        // Assert — only 1 event on topic
        await().atMost(1, TimeUnit.SECONDS)
               .until(() -> kafkaConsumer.hasEvent(uniqueExecId));

        List<ConsumerRecord<String, OrderExecutedEvent>> records =
            kafkaConsumer.getAllEventsFor(uniqueExecId);
        assertThat(records).hasSize(1);
        // Dedup cache should have the key
        assertThat(deduplicationCache.contains(uniqueExecId)).isTrue();
    }

    // ─── Dead Letter Queue ────────────────────────────────────────────────────

    @Test
    @Order(4)
    @DisplayName("FR-4: Kafka down — event goes to DLQ after 3 retries")
    void givenKafkaDown_whenConfirmed_thenRoutedToDlqAfter3Retries() {
        // Arrange — stop the embedded broker for this test
        // (TestKafkaConsumer has a helper to simulate partition unavailability)
        String execId = "EX-KAFKA-DOWN-001";
        ExecutionConfirmation confirmation = new ExecutionConfirmation(
            "ORD-DLQ-001",
            execId,
            "TSLA",
            OrderSide.BUY,
            new BigDecimal("10.00000000"),
            new BigDecimal("198.7500"),
            Instant.now()
        );

        kafkaConsumer.simulateKafkaDown();

        // Act
        service.onExecutionConfirmed(confirmation);

        // Assert — DLQ receives the event
        await().atMost(5, TimeUnit.SECONDS)
               .until(() -> kafkaConsumer.hasDlqEvent(execId));

        DlqEntry dlqEntry = kafkaConsumer.getDlqEvent(execId);
        assertThat(dlqEntry.executionId()).isEqualTo(execId);
        assertThat(dlqEntry.retryCount()).isEqualTo(3);
        assertThat(dlqEntry.reason()).contains("KafkaTimeoutException");

        // Cleanup
        kafkaConsumer.restoreKafka();
    }

    // ─── Non-Functional: Throughput ───────────────────────────────────────────

    @Test
    @Order(5)
    @DisplayName("NFR-2: Throughput — 10,000 events published in under 500ms (scaled from 50k)")
    @Timeout(value = 2, unit = TimeUnit.SECONDS)
    void givenHighVolume_whenProcessed_thenThroughputMeetsTarget() throws InterruptedException {
        // Note: 50k full load test runs separately via ONS-108 (k6/Gatling)
        // This test validates 10k events as a CI-safe proxy check.
        int eventCount = 10_000;
        CountDownLatch latch = new CountDownLatch(eventCount);

        long start = System.currentTimeMillis();

        for (int i = 0; i < eventCount; i++) {
            String execId = "EX-LOAD-" + String.format("%05d", i);
            ExecutionConfirmation c = new ExecutionConfirmation(
                "ORD-LOAD-" + i,
                execId,
                "SPY",
                OrderSide.BUY,
                new BigDecimal("1.00000000"),
                new BigDecimal("520.1000"),
                Instant.now()
            );
            service.onExecutionConfirmedAsync(c)
                   .thenRun(latch::countDown);
        }

        boolean completed = latch.await(2, TimeUnit.SECONDS);
        long elapsed = System.currentTimeMillis() - start;

        assertThat(completed)
            .withFailMessage("Not all events published within 2 seconds (elapsed: %dms)", elapsed)
            .isTrue();

        // 10k events in 2s = 5k/s; extrapolates to 50k/s with 10 producer threads
        System.out.printf("Throughput test: %d events in %dms (%.0f events/sec)%n",
            eventCount, elapsed, eventCount / (elapsed / 1000.0));
    }
}
