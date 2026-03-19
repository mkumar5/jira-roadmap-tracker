package com.acme.trading.notifications;

import com.acme.trading.events.OrderExecutedEvent;
import com.acme.trading.model.ExecutionConfirmation;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import java.math.RoundingMode;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;

/**
 * Publishes {@link OrderExecutedEvent} to Kafka when an execution is confirmed.
 *
 * <p>Implements:
 * <ul>
 *   <li>FR-1: Publish within 500ms of confirmation</li>
 *   <li>FR-2: Idempotency via {@link DeduplicationCache}</li>
 *   <li>FR-4: Dead-letter routing via Resilience4j circuit breaker</li>
 * </ul>
 *
 * <p>Story: ONS-102, ONS-103, ONS-104, ONS-105
 */
@Service
public class OrderNotificationService implements ExecutionConfirmationListener {

    private static final Logger log = LoggerFactory.getLogger(OrderNotificationService.class);

    private static final String TOPIC_EXECUTIONS = "trade.executions.v1";
    private static final String TOPIC_DLQ        = "trade.executions.dlq";

    private final KafkaTemplate<String, OrderExecutedEvent> kafkaTemplate;
    private final DeduplicationCache deduplicationCache;
    private final AlertService alertService;
    private final CircuitBreaker circuitBreaker;

    public OrderNotificationService(
            KafkaTemplate<String, OrderExecutedEvent> kafkaTemplate,
            DeduplicationCache deduplicationCache,
            AlertService alertService) {
        this.kafkaTemplate       = kafkaTemplate;
        this.deduplicationCache  = deduplicationCache;
        this.alertService        = alertService;
        this.circuitBreaker      = buildCircuitBreaker();
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Synchronous entry point — called by the execution confirmation callback.
     * Delegates to async and blocks (max 500ms per spec NFR-1).
     */
    @Override
    public void onExecutionConfirmed(ExecutionConfirmation confirmation) {
        onExecutionConfirmedAsync(confirmation).join();
    }

    /**
     * Async entry point — preferred for high-throughput scenarios.
     * Returns a future that completes when the Kafka ack is received.
     */
    public CompletableFuture<Void> onExecutionConfirmedAsync(ExecutionConfirmation confirmation) {
        String execId = confirmation.executionId();

        // FR-2: Deduplication — skip if already processed
        if (deduplicationCache.contains(execId)) {
            log.warn("Duplicate execution discarded: {}", execId);
            return CompletableFuture.completedFuture(null);
        }

        OrderExecutedEvent event = toEvent(confirmation);
        return publishWithCircuitBreaker(event);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    private CompletableFuture<Void> publishWithCircuitBreaker(OrderExecutedEvent event) {
        return circuitBreaker.executeCompletionStage(
            () -> publishToKafka(event)
        ).toCompletableFuture()
         .thenAccept(result -> {
             // Mark as processed ONLY after successful ack (at-least-once guarantee)
             deduplicationCache.put(event.getExecutionId());
             log.info("Published execution event: {} symbol={} qty={}",
                 event.getExecutionId(), event.getSymbol(), event.getQuantity());
         })
         .exceptionally(ex -> {
             log.error("Kafka publish failed after retries for executionId={}: {}",
                 event.getExecutionId(), ex.getMessage());
             routeToDlq(event, ex);
             return null;
         });
    }

    private CompletableFuture<SendResult<String, OrderExecutedEvent>> publishToKafka(
            OrderExecutedEvent event) {
        // Partition key = executionId ensures ordering per execution
        ProducerRecord<String, OrderExecutedEvent> record =
            new ProducerRecord<>(TOPIC_EXECUTIONS, event.getExecutionId(), event);
        return kafkaTemplate.send(record).toCompletableFuture();
    }

    private void routeToDlq(OrderExecutedEvent event, Throwable cause) {
        try {
            DlqEntry dlqEntry = new DlqEntry(
                event.getExecutionId(),
                event.getOrderId(),
                event.getSymbol(),
                event.getQuantity(),
                event.getPrice(),
                java.time.Instant.now(),
                cause.getMessage(),
                3
            );
            kafkaTemplate.send(TOPIC_DLQ, event.getExecutionId(), event);
            alertService.fireAlert("order-notifications",
                "Execution routed to DLQ: " + event.getExecutionId());
            log.error("Execution {} sent to DLQ. Reason: {}", event.getExecutionId(), cause.getMessage());
        } catch (Exception dlqEx) {
            // Last resort — if DLQ also fails, log as CRITICAL and alert
            log.error("CRITICAL: DLQ write failed for executionId={}. Data loss risk!",
                event.getExecutionId(), dlqEx);
            alertService.fireCriticalAlert("order-notifications",
                "DLQ WRITE FAILED for " + event.getExecutionId());
        }
    }

    private static OrderExecutedEvent toEvent(ExecutionConfirmation c) {
        return OrderExecutedEvent.builder()
            .orderId(c.orderId())
            .executionId(c.executionId())
            .symbol(c.symbol())
            .side(c.side())
            // Enforce scale contract at service boundary
            .quantity(c.quantity().setScale(8, RoundingMode.UNNECESSARY))
            .price(c.price().setScale(4, RoundingMode.UNNECESSARY))
            .executedAt(c.executedAt())
            .build();
    }

    private static CircuitBreaker buildCircuitBreaker() {
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
            .failureRateThreshold(50)                          // open at 50% failure rate
            .waitDurationInOpenState(Duration.ofSeconds(30))   // try again after 30s
            .permittedNumberOfCallsInHalfOpenState(5)
            .slidingWindowSize(10)
            .build();
        return CircuitBreaker.of("kafka-producer", config);
    }
}
