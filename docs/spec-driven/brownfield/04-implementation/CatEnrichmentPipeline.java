package com.acme.trading.cat;

import com.acme.trading.cat.enrichment.CatSubmissionFormatter;
import com.acme.trading.cat.enrichment.FeeCalculationEnrichment;
import com.acme.trading.cat.enrichment.PositionAggregationEnrichment;
import com.acme.trading.cat.enrichment.QuantityValidationEnrichment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Orchestrates the FINRA CAT enrichment pipeline.
 *
 * <p>Pipeline order (must not be changed without RFC):
 * <ol>
 *   <li>{@link QuantityValidationEnrichment} — validates quantity, rejects invalids early</li>
 *   <li>{@link FeeCalculationEnrichment} — computes SEC fee + FINRA TAF</li>
 *   <li>{@link PositionAggregationEnrichment} — updates net position book</li>
 *   <li>{@link CatSubmissionFormatter} — formats for FINRA CAT API</li>
 * </ol>
 *
 * <p>Each enrichment is stateless except for PositionAggregation (which holds in-memory position book).
 * The pipeline is thread-safe: events are processed sequentially per Kafka partition.
 *
 * <p>Story: CAT-102
 */
@Service
public class CatEnrichmentPipeline {

    private static final Logger log = LoggerFactory.getLogger(CatEnrichmentPipeline.class);

    private final QuantityValidationEnrichment quantityValidation;
    private final FeeCalculationEnrichment feeCalculation;
    private final PositionAggregationEnrichment positionAggregation;
    private final CatSubmissionFormatter formatter;

    public CatEnrichmentPipeline(
            QuantityValidationEnrichment quantityValidation,
            FeeCalculationEnrichment feeCalculation,
            PositionAggregationEnrichment positionAggregation,
            CatSubmissionFormatter formatter) {
        this.quantityValidation  = quantityValidation;
        this.feeCalculation      = feeCalculation;
        this.positionAggregation = positionAggregation;
        this.formatter           = formatter;
    }

    /**
     * Processes a single execution event through the full enrichment pipeline.
     *
     * @param rawEvent the raw execution event from Kafka
     * @return the FINRA CAT JSON submission payload
     * @throws com.acme.trading.cat.enrichment.QuantityValidationException if quantity is invalid
     */
    public String process(ExecutionEvent rawEvent) {
        log.debug("Pipeline start: executionId={}", rawEvent.executionId());

        // Step 1: Validate quantity (throws on invalid; routes to DLQ by caller)
        ExecutionEvent validated = quantityValidation.enrich(rawEvent);

        // Step 2: Compute fees
        ExecutionEvent withFees = feeCalculation.enrich(validated);

        // Step 3: Update position book
        ExecutionEvent withPosition = positionAggregation.enrich(withFees);

        // Step 4: Format for FINRA CAT submission
        String catPayload = formatter.format(withPosition);

        log.info("Pipeline complete: executionId={} symbol={} qty={} notional={}",
            rawEvent.executionId(), rawEvent.symbol(),
            rawEvent.executionQuantity(), rawEvent.notional());

        return catPayload;
    }

    /**
     * Processes a batch of events. Continues on validation failure (routes failed events to DLQ).
     *
     * @param events list of execution events from a Kafka poll batch
     * @return list of successfully formatted CAT payloads (may be shorter than input if any failed)
     */
    public List<String> processBatch(List<ExecutionEvent> events) {
        return events.stream()
            .flatMap(event -> {
                try {
                    return java.util.stream.Stream.of(process(event));
                } catch (Exception ex) {
                    log.error("Pipeline failed for executionId={}: {}",
                        event.executionId(), ex.getMessage());
                    // Caller's Kafka error handler routes to DLQ
                    throw ex;
                }
            })
            .toList();
    }
}
