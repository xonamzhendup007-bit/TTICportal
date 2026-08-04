# Test Plan · `<Project / Release Name>` · v<0.1>

> **Test Plan** · structured per **IEEE 829 / ISO/IEC/IEEE 29119-3** (Test Documentation).
> The single document that tells every reader — QA, Dev, PM, stakeholder — **what will be tested, how, by whom, to what quality bar, and when we say "done"**.
> Target length: 10–25 pages for a release; 3–5 pages for a single feature.

---

## § 01 · Test Plan Identifier

- **ID:** `TP-<project>-<release>-<version>`
- **Title:** `<release name> Test Plan`
- **Status:** Draft / Review / Approved / Active / Closed
- **Version:** `0.1`
- **Author(s):** `<QA Lead>`
- **Reviewers:** QA Manager · Dev Lead · PM · Release Manager
- **Last updated:** `YYYY-MM-DD`

## § 02 · Introduction

- **Purpose of this plan:** `<what testing effort this plan covers>`
- **Scope summary:** `<one paragraph>`
- **Intended audience:** QA team · dev team · product · leadership

## § 03 · References

Every document this plan depends on or traces to.

1. PRD — `<link>`
2. SRS / Feature specs — `<links>`
3. HLD / LLD — `<links>`
4. Requirements traceability matrix — `<link>`
5. Test strategy (program level) — `<link>`
6. Applicable standards — `<IEEE 829 · ISO 29119 · WCAG 2.1 · OWASP ASVS>`

## § 04 · Test Items

What exactly is being tested.

| Item | Version | Source | Linked spec |
|---|---|---|---|
| `<Module / Service A>` | v2.3 | `<repo>` | `<spec link>` |
| `<Module / Service B>` | v1.0 | `<repo>` | `<spec link>` |
| `<Integration: A ↔ External GW>` | — | — | `<HLD §8>` |

## § 05 · Features to be Tested

Trace each back to a requirement.

| Feature / Requirement | Source | Priority | Test Type(s) |
|---|---|---|---|
| FR-01 · Save a favourite | Feature Spec §6 | P0 | Functional · Integration |
| FR-02 · View favourites | Feature Spec §6 | P0 | Functional · Perf · A11y |
| NFR-Perf · p95 < 1s on 4G | Feature Spec §8 | P0 | Performance |
| NFR-Sec · scope to user | Feature Spec §8 | P0 | Security |

## § 06 · Features NOT to be Tested

Explicit list — and **why** for each. Prevents "nobody tested that" fights later.

- `<feature X>` — deferred to next release per PM decision `<date>`
- `<third-party API behaviour>` — vendor warranty; relying on their QA
- `<legacy platform>` — unsupported per product decision

## § 07 · Approach (Test Strategy)

The overall philosophy. Reference the program-level strategy; describe project-specific choices.

### 7.1 · Test Levels
| Level | Who | What | Tools |
|---|---|---|---|
| Unit | Dev | Isolated functions/classes | Jest / JUnit / pytest |
| Integration | Dev + QA | Service ↔ service, DB, caches | Testcontainers |
| System (E2E) | QA | End-to-end user flows | Playwright |
| Acceptance (UAT) | Business / QA | Business-scenario validation | Manual + scripted |

### 7.2 · Test Types
- **Functional** — against AC
- **Regression** — shipped features stay working
- **Performance** — load · stress · soak · spike (k6 / JMeter)
- **Security** — OWASP Top 10 · authZ matrix · dependency CVEs (OWASP ZAP · Snyk)
- **Accessibility** — WCAG AA (axe · keyboard · screen reader)
- **Compatibility** — browser / OS / device matrix
- **Localisation** — language · locale · RTL · date/currency
- **Recovery / resilience** — chaos · failover
- **Usability** — optional, session-based

### 7.3 · Techniques
Equivalence partitioning · boundary value analysis · decision tables · state-transition · exploratory · risk-based prioritisation.

### 7.4 · Automation Strategy
- **Unit:** 100% of changed code paths touched.
- **Integration:** all happy-path + critical edges automated.
- **E2E:** top 20 user journeys automated; long tail covered by exploratory.
- **Tooling:** `<Playwright · Postman/Newman · k6 · axe-core · Snyk>`

## § 08 · Item Pass / Fail Criteria

When a test item is considered PASS or FAIL.

- **PASS:** all P0 + P1 test cases pass; P2 failures triaged and accepted by PM.
- **FAIL:** any P0 test fails; OR >10% P1 fails; OR any security / data-loss defect.

## § 09 · Entry Criteria

What must be true before testing can start.

- [ ] Feature spec / SRS approved
- [ ] Build deployed to test environment · smoke test green
- [ ] Test data prepared & refreshed
- [ ] Test cases reviewed & approved
- [ ] Dev has marked ticket(s) "Ready for QA"
- [ ] Known blocker defects resolved or flagged

## § 10 · Suspension & Resumption Criteria

### Suspend testing when
- Smoke tests fail on a new build
- A P0 defect blocks >50% of remaining test cases
- Test environment unavailable > 4 h

### Resume when
- Blocker fixed & verified
- Environment restored · data valid

## § 11 · Exit Criteria (Release Readiness)

Testing is **done** for this release when:

- [ ] 100% of P0 test cases executed; **0 P0 defects open**
- [ ] ≥ 95% of P1 test cases executed; **0 P1 defects open** (or accepted by PM with mitigation)
- [ ] Known-issue list published and reviewed with PM
- [ ] Performance targets met (see §05 · NFRs)
- [ ] Security scan clean or exceptions approved by Security
- [ ] Accessibility scan: no critical axe violations
- [ ] Regression suite green on final build
- [ ] Test report signed by QA Lead, Dev Lead, PM

## § 12 · Deliverables

What QA produces and hands over.

- Test strategy & plan (this doc)
- Test cases (in TestRail / Xray / Zephyr) — `<link>`
- Defect reports (Jira / Linear)
- Automation code — `<repo>`
- Test data scripts
- Daily execution reports
- Final test summary report
- Traceability matrix (reqs → test cases → defects)

## § 13 · Test Environment

| Env | Purpose | URL | Data | Stability SLA |
|---|---|---|---|---|
| QA-A | Functional, regression | `<url>` | Synthetic | 95% |
| QA-B | Integration w/ sandbox partners | `<url>` | Synthetic + sandbox | 90% |
| Perf | Load / stress | `<url>` | Scaled prod-like | On-demand |
| Staging | UAT, release rehearsal | `<url>` | Anonymised prod subset | 99% |

**Infrastructure:** `<cloud / region · k8s cluster · managed DB>`
**Refresh cadence:** `<daily rebuild · weekly data refresh>`

## § 14 · Test Data

- **Sources:** synthetic generators · masked prod snapshots · fixture files
- **Sensitive data handling:** PII masked · CID scrambled · no real card data ever
- **Refresh strategy:** reset-before-run for E2E; shared pool for exploratory
- **Volume for perf:** 1M users · 10M transactions · 30d history

## § 15 · Responsibilities

**RACI** for the release.

| Activity | R | A | C | I |
|---|---|---|---|---|
| Test plan authorship | QA Lead | QA Manager | Dev Lead, PM | Team |
| Test case design | QA engineers | QA Lead | BA, Dev | PM |
| Automation build | QA engineers | QA Lead | Dev | — |
| Test execution | QA engineers | QA Lead | Dev (fix) | PM |
| Defect triage | QA Lead | PM | Dev Lead | Team |
| Sign-off | QA Lead + Dev Lead | PM | Security, Ops | Leadership |

*(SELISE uses RCI internally — map A↔R where applicable.)*

## § 16 · Staffing & Training Needs

| Role | Count | Named | Ramp-up needs |
|---|---|---|---|
| QA Lead | 1 | `<name>` | — |
| QA Engineer · Functional | 2 | `<names>` | — |
| QA Engineer · Automation | 1 | `<name>` | Playwright refresher |
| SDET · Performance | 0.5 | `<name>` | — |

## § 17 · Schedule

Milestones tied to project calendar.

| Milestone | Date | Owner |
|---|---|---|
| Test cases drafted | `<date>` | QA engineers |
| Test cases reviewed | `<date>` | QA Lead + Dev |
| Automation framework ready | `<date>` | SDET |
| Functional testing starts | `<date>` | QA |
| Integration testing | `<date>` | QA + Dev |
| Performance testing | `<date>` | SDET |
| Regression cycle | `<date>` | QA |
| UAT | `<date>` | Business |
| Go/No-Go review | `<date>` | PM + QA + Dev |
| Release | `<date>` | Release Mgr |

## § 18 · Risks & Contingencies

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Test environment unstable | M | H | Daily smoke · backup env |
| Late feature delivery compresses QA | H | H | Risk-based prioritisation · feature-flag buffer |
| Perf test data unavailable | M | M | Synthetic generator ready at -2 weeks |
| Key QA person out | L | M | Pair + knowledge doc |

## § 19 · Metrics & Reporting

### Metrics captured daily
- Test cases: planned · executed · passed · failed · blocked · deferred
- Defects by severity: open · closed · reopened
- Automation pass rate
- Coverage vs requirements (% of requirements with ≥1 test)

### Reporting cadence
- **Daily** stand-up summary (slack) — 3 lines.
- **Weekly** status to PM — burndown · top risks.
- **End of cycle** — full test summary report.

## § 20 · Defect Management

- **Tool:** `<Jira / Linear>`
- **Lifecycle:** New → Triaged → In-Progress → In-Review → In-QA → Closed / Reopened
- **Severity definitions:**
  - **S1 Critical** — data loss, security breach, >50% users blocked
  - **S2 Major** — core feature broken, clear workaround missing
  - **S3 Minor** — feature degraded, workaround exists
  - **S4 Cosmetic** — UI polish, docs, non-blocking
- **Triage cadence:** daily during active testing; 2×/week otherwise
- **SLA:** S1 acknowledged < 1 h · S2 < 4 h · S3/S4 < 1 day

## § 21 · Approvals

| Role | Name | Signature | Date |
|---|---|---|---|
| QA Lead | | | |
| Dev Lead | | | |
| Product Manager | | | |
| Security | | | |
| Release Manager | | | |

---

## Appendix A · Requirements Traceability Matrix (link)

Every requirement traces to one or more test cases. Maintained in `<TestRail / spreadsheet>`.

## Appendix B · Test Case Template

```
Test Case ID:   TC-<area>-<nnn>
Title:          <short>
Linked req:     FR-01 / NFR-3.3.1
Priority:       P0 / P1 / P2
Type:           Functional / Integration / Perf / A11y / Security
Preconditions:  <state>
Steps:
  1. <action>
  2. <action>
Expected result: <observable, testable>
Test data:      <reference>
Automation:     <yes / no · link to script>
```

---

## Changelog

- `v0.1` · initial draft · `<author>` · `YYYY-MM-DD`
- `v0.5` · dev & PM review folded · `YYYY-MM-DD`
- `v1.0` · approved · `YYYY-MM-DD`
