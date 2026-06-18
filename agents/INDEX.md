# Agent Catalog

*Auto-generated. 7 entries.*

| Name | Description | File |
|------|-------------|------|
| `maestro-conductor` | Orchestrates the full AI Native Feature Builder pipeline. Routes through phases: intake → research → ADR → implementa... | `maestro-conductor.md` |
| `maestro-critic` | Devil's Advocate — reviews every pipeline phase output with FRESH context (no prior bias). Finds flaws with evidence ... | `maestro-critic.md` |
| `maestro-doc` | Documentation agent — writes Solution Design Documents (SDD) on Confluence following Degreed AG template, publishes r... | `maestro-doc.md` |
| `maestro-implementer` | Implements one approach for a feature as a full vertical slice: Python → .NET → Angular → Flutter. Runs in isolated w... | `maestro-implementer.md` |
| `maestro-researcher` | Phase 1 deep research agent. Scans all 5 repos, searches Confluence wiki, GitHub PRs, internet (mandatory 5+ searches... | `maestro-researcher.md` |
| `maestro-reviewer` | Phase 3.5 code review agent. Validates standards compliance, dependency safety, Apollo components, i18n, a11y, migrat... | `maestro-reviewer.md` |
| `maestro-triage` | Routes incoming requests to the right specialist. Jira Epic → conductor. Bug ticket → conductor (bug mode). Spike → r... | `maestro-triage.md` |
