package com.acme.trading.cat.enrichment;

/**
 * Thrown when an execution quantity fails validation in the CAT enrichment pipeline.
 *
 * <p>Callers should route the offending event to the dead-letter queue and alert ops.
 */
public class QuantityValidationException extends RuntimeException {

    private final String executionId;

    public QuantityValidationException(String message, String executionId) {
        super(message + " [executionId=" + executionId + "]");
        this.executionId = executionId;
    }

    public String getExecutionId() {
        return executionId;
    }
}
