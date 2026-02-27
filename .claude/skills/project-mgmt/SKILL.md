---
name: project-mgmt
description: 'Update MERIDIAN project tracking documents — roadmap, task log, project status, and vision. Use this skill AFTER completing any task, milestone, or phase. Also use when starting a new work session to review current status and plan next steps. Always invoke this skill before ending a work session.'
---

# Project Management for MERIDIAN

## After Every Completed Task

1. **Task Log** (`docs/TASKLOG.md`): Append entry with ISO 8601 timestamp, task description, files changed, and any decisions made.

2. **Project Status** (`docs/PROJECT-STATUS.md`): Update current phase progress, check off completed items, update metrics (files created, lines of code, test status), note any blockers or deviations from spec.

3. **Roadmap** (`docs/ROADMAP.md`): Check off completed milestones. If a phase is complete, update phase status and add actual completion date.

## At Session Start

Read `docs/PROJECT-STATUS.md` to understand current state. Check `docs/TASKLOG.md` for last completed task. Review `docs/ROADMAP.md` for next milestone.

## At Session End

Run `/project-mgmt` to update all three documents with session progress. Include:
- What was accomplished
- What's next
- Any open questions or blockers
- Build/test status

## Format Standards

Task log entries:
```
### [YYYY-MM-DDTHH:MM:SSZ] Task Description
- **Phase**: N
- **Files**: list of files created/modified
- **Decisions**: any DECISION: comments added to code
- **Status**: complete | partial | blocked
```

Status updates use current date, phase number, percentage complete per phase.
