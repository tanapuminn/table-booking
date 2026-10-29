# Design QA

- Source visual truth: `C:\Users\Admin\.codex\generated_images\01a185c7-ee7d-7883-ad2a-11557da872be\exec-34a39846-e95b-459b-9d8f-7912e283fc31.png`
- Customer-layout reference: `C:\Users\Admin\AppData\Local\Temp\codex-clipboard-e936e96e-58da-4347-8afa-aac1d5268094.png`
- Intended viewport: 1440 × 1024 CSS px at device scale factor 1
- State: admin layout editor, edit mode, all zones visible
- Implementation screenshot: unavailable

**Findings**

- [P1] Browser-rendered comparison is unavailable
  - Location: `/psmnlp-dashboard?section=layout`
  - Evidence: the production build and TypeScript checks pass, but the browser-control session could not access the newly started local development port. The existing port was serving a stale Next.js process after its `.next` output changed.
  - Impact: typography, spacing, responsive overflow, and visual fidelity cannot be approved from source code alone.
  - Fix: open the running application in a browser session that can reach the local development server, capture edit and Preview states at 1440 × 1024, and compare them with the two source images.

**Required Fidelity Surfaces**

- Fonts and typography: not visually verified; implementation uses the existing Segoe UI / Noto Sans Thai stack.
- Spacing and layout rhythm: not visually verified; responsive three-column edit layout and two-column Preview layout are implemented.
- Colors and visual tokens: not visually verified; implementation uses the existing primary and semantic tokens plus restrained zone accent colors.
- Image quality and asset fidelity: no raster assets are required by this screen; the stage, tables, controls, and status indicators are native UI elements.
- Copy and content: statically reviewed. Labels distinguish edit mode, customer Preview, global grid size, zone settings, and table settings.

**Interaction Checks Completed Without Browser Mutation**

- TypeScript: passed.
- Production build: passed.
- Table-layout unit tests: 4 passed.
- Global-grid shrink validation: implemented for tables from every zone.
- Global collision validation: implemented across every zone.
- Legacy `?section=zones` URL: redirects internally to the combined layout section.

**Open Questions**

- None about the requested behavior. Visual browser access remains the only blocker.

**Implementation Checklist**

1. Capture the editor at 1440 × 1024.
2. Verify zone list, unified map, and inspector fit without clipped controls.
3. Switch to Preview and compare table positions against the customer page.
4. Test the global grid dialog and one non-destructive table selection.
5. Check browser console errors and repeat comparison after any visual fixes.

**Comparison History**

- Initial pass: blocked before visual comparison because no browser-rendered implementation screenshot could be captured.

final result: blocked
