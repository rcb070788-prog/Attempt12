# Copilot Instructions for this repo

## Non-negotiable rules
- Do NOT rewrite entire files.
- Do NOT reformat unrelated code.
- Make the smallest change that solves the request.
- Preserve existing behavior unless explicitly told otherwise.

## Workflow
1) First, identify the exact file(s) and all relevant code sections.
2) Then propose a minimal edit.
3) Output changes as:
   - FILE PATH
   - FIND (exact snippet, include a few surrounding lines)
   - REPLACE (exact snippet)

## Editing limits
- If the change requires more than ~40 lines modified, stop and propose a smaller plan or multiple patches.

## Testing
- End every response with a short "Test" checklist (what I should click/run to verify).
