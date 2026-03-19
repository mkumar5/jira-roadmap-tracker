package com.acme.trading.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Domain event published when an order fill is confirmed.
 *
 * <p>This is the Java-side representation of the Avro schema defined in
 * {@code 01-spec/order-events.avsc}. It is serialized to/from Avro bytes
 * by the Confluent Schema Registry serializer.
 *
 * <p><strong>IMPORTANT:</strong> quantity and price use {@link BigDecimal} —
 * never {@code double} or {@code float}. Floating-point is banned for financial values
 * per the engineering standards (ADR-007).
 *
 * <p>Spec: ONS-SPEC-001 FR-1
 * Story: ONS-101
 */
public final class OrderExecutedEvent {

    private final String eventId;
    private final int eventVersion;
    private final String orderId;
    private final String executionId;
    private final String symbol;
    private final OrderSide side;
    private final BigDecimal quantity;   // scale=8, e.g. 100.00000000
    private final BigDecimal price;      // scale=4, e.g. 182.3400
    private final String currency;
    private final Instant executedAt;
    private final String venue;          // nullable
    private final String catReportingId; // nullable, set after CAT submission
    private final Map<String, String> metadata;

    private OrderExecutedEvent(Builder builder) {
        this.eventId        = Objects.requireNonNull(builder.eventId, "eventId");
        this.eventVersion   = builder.eventVersion;
        this.orderId        = Objects.requireNonNull(builder.orderId, "orderId");
        this.executionId    = Objects.requireNonNull(builder.executionId, "executionId");
        this.symbol         = Objects.requireNonNull(builder.symbol, "symbol");
        this.side           = Objects.requireNonNull(builder.side, "side");
        this.quantity       = validateScale(builder.quantity, 8, "quantity");
        this.price          = validateScale(builder.price, 4, "price");
        this.currency       = builder.currency != null ? builder.currency : "USD";
        this.executedAt     = Objects.requireNonNull(builder.executedAt, "executedAt");
        this.venue          = builder.venue;
        this.catReportingId = builder.catReportingId;
        this.metadata       = Collections.unmodifiableMap(
                                  builder.metadata != null ? builder.metadata : Collections.emptyMap());
    }

    // ─── Validation ───────────────────────────────────────────────────────────

    private static BigDecimal validateScale(BigDecimal value, int requiredScale, String fieldName) {
        Objects.requireNonNull(value, fieldName);
        // Enforce scale — setScale throws ArithmeticException if precision is lost
        return value.setScale(requiredScale, java.math.RoundingMode.UNNECESSARY);
    }

    // ─── Accessors ────────────────────────────────────────────────────────────

    public String getEventId()         { return eventId; }
    public int getEventVersion()       { return eventVersion; }
    public String getOrderId()         { return orderId; }
    public String getExecutionId()     { return executionId; }
    public String getSymbol()          { return symbol; }
    public OrderSide getSide()         { return side; }
    public BigDecimal getQuantity()    { return quantity; }
    public BigDecimal getPrice()       { return price; }
    public String getCurrency()        { return currency; }
    public Instant getExecutedAt()     { return executedAt; }
    public String getVenue()           { return venue; }
    public String getCatReportingId()  { return catReportingId; }
    public Map<String, String> getMetadata() { return metadata; }

    // ─── Computed ─────────────────────────────────────────────────────────────

    /** Gross notional value = quantity × price, scale=12 to avoid rounding during computation. */
    public BigDecimal grossNotional() {
        return quantity.multiply(price).setScale(12, java.math.RoundingMode.HALF_EVEN);
    }

    // ─── Builder ──────────────────────────────────────────────────────────────

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private String eventId = UUID.randomUUID().toString();
        private int eventVersion = 1;
        private String orderId;
        private String executionId;
        private String symbol;
        private OrderSide side;
        private BigDecimal quantity;
        private BigDecimal price;
        private String currency = "USD";
        private Instant executedAt;
        private String venue;
        private String catReportingId;
        private Map<String, String> metadata;

        public Builder orderId(String v)         { this.orderId = v; return this; }
        public Builder executionId(String v)     { this.executionId = v; return this; }
        public Builder symbol(String v)          { this.symbol = v; return this; }
        public Builder side(OrderSide v)         { this.side = v; return this; }
        public Builder quantity(BigDecimal v)    { this.quantity = v; return this; }
        public Builder price(BigDecimal v)       { this.price = v; return this; }
        public Builder currency(String v)        { this.currency = v; return this; }
        public Builder executedAt(Instant v)     { this.executedAt = v; return this; }
        public Builder venue(String v)           { this.venue = v; return this; }
        public Builder catReportingId(String v)  { this.catReportingId = v; return this; }
        public Builder metadata(Map<String, String> v) { this.metadata = v; return this; }

        public OrderExecutedEvent build() {
            return new OrderExecutedEvent(this);
        }
    }

    @Override
    public String toString() {
        return "OrderExecutedEvent{" +
               "executionId='" + executionId + '\'' +
               ", orderId='" + orderId + '\'' +
               ", symbol='" + symbol + '\'' +
               ", quantity=" + quantity +
               ", price=" + price +
               ", executedAt=" + executedAt +
               '}';
    }
}
