# Spec-Driven Development — Working Examples

This directory contains **end-to-end working examples** of spec-driven development for two scenarios:

| Directory | Scenario | Pattern |
|-----------|----------|---------|
| [`greenfield/`](./greenfield/) | New **Order Notification Service** | Spec → Jira → TDD → Implement → Release |
| [`brownfield/`](./brownfield/) | FINRA CAT `executionQuantity` precision change | RFC → Strangler Fig → Feature Flag → Canary |

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                   SPEC-DRIVEN DEVELOPMENT WORKFLOW                    │
└─────────────────────────────────────────────────────────────────────┘

  GREENFIELD                          BROWNFIELD
  ──────────                          ──────────
  00-prd.md                           00-rfc.md
      │                                   │
      ▼                                   ▼
  01-spec/                            01-as-is/
   ├── *.spec.md   (Kiro/OpenSpec)     ├── Domain objects (current state)
   ├── *.yaml      (OpenAPI)           └── Enrichments (Long qty)
   └── *.avsc      (Avro schema)
      │                                   │
      ▼                                   ▼
  02-stories/                         02-spec/
   └── TASK_REGISTRY.md                ├── *.avsc  (v2 schema)
      │                                └── *.feature (BDD scenarios)
      ▼                                    │
  03-tests/   ← Write tests FIRST          ▼
   ├── *Test.java (JUnit 5)            03-tests/
   └── *.feature  (Gherkin BDD)         ├── *Test.java (red phase)
      │                                └── *ContractTest.java (Pact)
      ▼                                    │
  04-implementation/                       ▼
   ├── *Service.java                   04-implementation/
   └── *Event.java                      ├── Feature-flagged enrichments
                                        └── BigDecimal domain objects
```

## Tools Referenced

| Tool | Role | Open Source |
|------|------|-------------|
| **Kiro** | AI-assisted spec generation from PRD | Yes |
| **OpenSpec / Spec.it** | Executable spec format | Yes |
| **Gherkin / Cucumber** | BDD scenario authoring | Yes (MIT) |
| **Pact** | Consumer-driven contract testing | Yes (Apache 2.0) |
| **Avro** | Schema evolution with registry | Yes (Apache 2.0) |
| **OpenFeature** | Feature flag standard | Yes (CNCF) |

## How to Navigate

1. Start with the `README.md` inside each subdirectory
2. Read specs **before** looking at implementation (that's the point)
3. Tests in `03-tests/` are written **before** `04-implementation/` (TDD red → green)
4. Feature files in `02-spec/` or `03-tests/` are the **executable contract** between business and engineering

## Industry Context

These examples follow patterns used at:
- **Amazon**: Working Backwards PRD → API-first specs → TDD → Two-pizza team delivery
- **Google**: Design Docs → Proto schemas → hermetic tests → phased rollout
- **Stripe**: RFC → API spec → changelog-driven versioning → canary deployment
- **Netflix**: Feature flags → A/B test → graduated rollout → auto-rollback
