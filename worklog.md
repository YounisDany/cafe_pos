---
Task ID: 1
Agent: Main
Task: Fix product name truncation in POS product selection grid + enable global theme system

Work Log:
- Read full page.tsx (~2789 lines) to understand POS product grid and settings flow
- Identified product card issue: `h-[120px]` fixed height with `text-xs`, `line-clamp-2`, and 4 stacked elements squeezing the name
- Redesigned product card: removed fixed height (now `min-h-[140px]`), increased padding, larger font (`text-sm font-semibold`), removed line-clamp, larger emoji, nicer price display
- Discovered that `/api/auth/login` and `/api/auth/me` did NOT return theme settings fields (primaryColor, secondaryColor, accentColor, etc.) - this meant global theme never applied after login
- Fixed both auth endpoints to return all company settings fields including theme colors
- Verified `/api/settings` GET/PUT routes already exist and work correctly
- Verified `/api/upload` POST route already exists for logo uploads
- Ran `db:push` - schema already in sync
- Ran `lint` - no errors
- Dev server confirmed running with successful API calls

Stage Summary:
- Product names now display fully in the POS grid with better spacing, larger text, and no truncation
- Global theme system now works end-to-end: user changes color in Settings → API saves → company store updates → ThemeApplier detects change → applyTheme() overrides all amber CSS classes site-wide
- All settings fields (theme, receipt, store info) now properly propagate through login and auth/me flows
