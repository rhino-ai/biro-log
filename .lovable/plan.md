# Already shipped this turn (push notifications)

- **Instant local browser notification** when you add a task with a reminder — fires at the exact minute via a service-worker `showNotification`, no server delay. Survives reloads (re-armed from localStorage on app boot + tab focus).
- **Server cron sped up from every 15 min to every 1 min**, so if the phone is offline the server push still arrives within ~60s.
- **Enable-Notifications card** added to the Tasks page so it's obvious when permission isn't granted (this was your real 20:22 bug — `push_subscriptions` was empty; the browser never asked to send pushes).

You need to tap **Enable** on that new card once — that's the missing step. After that, close the app entirely and add a task 1 min in the future to confirm.

---

# Next: Trackers = real spreadsheet + full nav reorg

## 1. Trackers page — real Google Sheets clone

Replace the current tracker view with a proper grid component.

**Grid editing**
- Click a cell to select; arrow keys / Tab / Shift+Tab / Enter / Shift+Enter to navigate.
- Double-click or F2 to enter edit mode; Escape cancels; Enter commits and moves down.
- Shift+arrow to extend a range selection; Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+X for copy/cut/paste across ranges (TSV clipboard so it round-trips with real Google Sheets).
- Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z for undo/redo (bounded history stack).
- Delete / Backspace clears selected range.

**Formulas + references**
- Cell references `A1`, `B12`; ranges `A1:A10`, `A:A`, `1:1`.
- Built-ins: `SUM`, `AVERAGE`/`AVG`, `MIN`, `MAX`, `COUNT`, `COUNTA`, `IF`, `AND`, `OR`, `NOT`, `ROUND`, `ABS`, `CONCAT`, `LEN`, `LEFT`, `RIGHT`, `MID`, `LOWER`, `UPPER`, `TODAY`, `NOW`.
- Auto-recalc on any edit via a topological pass over the dep graph.
- Circular-ref detection → shows `#CIRC!` in that cell only.
- Error surfacing: `#ERROR!`, `#REF!`, `#DIV/0!`, `#NAME?`.

**Multiple sheets + freeze**
- Sheet tabs at the bottom (add / rename / delete / reorder via drag).
- Cross-sheet refs like `Sheet2!A1` and `'My Sheet'!B2:B10`.
- Frozen header row and frozen first column (toggle in a View menu).
- Column resize by dragging the header edge; row height auto-fit.

**Storage**
- Persist per user in a `tracker_sheets` table (name + sheet-JSON blob) with strict RLS (`auth.uid() = user_id`). Debounced 1s auto-save, offline queue when signed out.

**Under the hood**
- Ship a small in-house engine (~500 LOC) rather than pulling a heavy grid library — same feel as Google Sheets for the ops above, and it stays fast on mobile.
- Mobile: pinch to zoom, tap-hold to select range, long-press header for column menu.

## 2. Navigation reorganization

**Home dashboard tiles** — group into four clearly labeled sections with sticky section headers:
- Study: Tasks, Revision, Trackers, Guide, Analytics
- Wellness: Journal, Wellness, Screen Time, Villain Mode
- Social: Friends, Virtual Library, Leaderboard, Biro-yaar
- Tools: Mind Games, Mentor, Feedback, Profile

**Bottom nav** — keep 5 slots but re-label for clarity: Home / Tasks / Mentor / Games / Social. (Wellness moves into the Home "Wellness" section since it's not a per-tap destination.)

**Tasks page tabs** — collapse the two tab rows into one segmented control: `Today · Week · Month · All` at the top; filters (Daily / Weekly / Monthly) become a single dropdown next to the search icon.

**Reversible**
- All three changes are gated behind a `nav_layout` setting (`v2` default, `legacy` opt-out) stored in the game store. If you ever say "put the old layout back," it's a one-line flip — no re-implementation needed.

## Order of work

1. Trackers spreadsheet grid + engine + storage.
2. Nav reorg (home sections, bottom-nav relabel, tasks tab collapse) behind `nav_layout` toggle.
3. QA pass on both.

Estimated ~1 build turn each — I'll ship Trackers first since it's the larger, more visible change.
