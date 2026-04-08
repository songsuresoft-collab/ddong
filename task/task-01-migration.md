# Task: Integrate Code Static Dashboard into Parent Next.js App

## Goal

Integrate an existing Next.js dashboard into the parent application as a nested feature under a new menu group.

This task focuses on:
- safe integration
- preserving existing logic
- aligning UI/UX with parent design system

---

## Branch

`sdv1-code`

---

## Child Project Location

The child project is located at:


frontend/sdv-solution-code-static/


This is the ONLY source of files to be moved and adapted.

---

## Main Requirement

Add a new menu group:

- SDV솔루션 업무 앱
  - 모델정적
  - 코드정적
  - 단위검증

Behavior:

- Parent menu expands/collapses
- "코드정적" loads the child dashboard
- Others are placeholders

---

## Routing

Base route:


/sdv-solution/code-static


Child routes:

- /sdv-solution/code-static
- /upload
- /reference
- /overview
- /compare
- /hotspot
- /trends
- /workboard
- /guide

---

## Scope

### In Scope

- Menu integration
- Child project integration
- Route restructuring
- Styling alignment

### Out of Scope

- Parent architecture redesign
- Backend changes
- Business logic changes

---

## Critical Constraints

### 1. Parent Protection

Do NOT refactor parent structure.

### 2. Child-Only Modification

Only modify files inside:


frontend/sdv-solution-code-static/


### 3. Feature Preservation

Keep:

- IndexedDB logic
- Compare / Trend / Hotspot / Workboard
- Existing data flow

---

## Styling Alignment (VERY IMPORTANT)

The child project UI must be adapted to match the parent project's design system.

Requirements:

- Reuse parent layout structure (sidebar, spacing, typography)
- Match color system (background, text, accent)
- Match component style (cards, tables, buttons)
- Avoid introducing a new design system

Approach:

- Inspect parent components under `/components`
- Reuse or adapt them when possible
- Update child components to follow parent UI patterns

---

## Integration Strategy

1. Analyze parent navigation structure
2. Add new collapsible menu group
3. Add submenu items
4. Move child app routes into:


app/sdv-solution/code-static/


5. Fix internal routing (base path update)
6. Align UI with parent design
7. Add placeholder pages

---

## Folder Strategy

Child code should be isolated:

- components/code-static/...
- hooks/code-static/...
- utils/code-static/...

Avoid modifying global parent folders.

---

## Validation

- Parent pages unchanged
- Menu works correctly
- Child pages load correctly
- UI visually consistent with parent
- No structural break

---

## Learning Mode

Explain:

- files changed
- routing adjustments
- styling adaptation approach

---

## Git Workflow

- Branch: sdv1-code
- Small commits
- No broad refactors