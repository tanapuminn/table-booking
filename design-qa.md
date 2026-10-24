# Booking UI design QA

- Source visual truth: `design/booking-seat-picker-reference.png` (1487 × 1058 px; desktop concept).
- Browser rendering: `design/booking-seat-picker-rendered.png` (893 × 884 px; 893 × 884 CSS viewport, device scale 1).
- Compared state: ordinary-zone table B4, seats 1–3 selected, seats 6–7 booked, seat price 300 baht, total 900 baht.
- Normalization: the source and rendered seat drawers are both about 570 CSS px wide. The full-page frames differ because the browser viewport is narrower than the concept; the rendered page correctly stacks the summary below the map.

## Findings

No actionable P0/P1/P2 differences remain in the seat-selection flow. The rendered drawer keeps the same school mark, magenta action hierarchy, round nine-seat table, selected/available/booked colors, mode control, price and confirmation action. The real seat controls are simpler than the illustrative chair drawings so each number remains a clear tap target; this is an intentional functional simplification.

## Fidelity checks

- Typography: Thai labels and prices remain readable; the app uses local system Thai fallbacks so production builds do not depend on downloading a font.
- Layout and spacing: the 570 px drawer fits all nine controls and keeps the total and action visible at the bottom. The narrower browser view uses the responsive stacked map and summary.
- Colors: the primary token now uses the school magenta. White, pink and slate states distinguish available, selected and booked seats.
- Image quality: the actual school logo is used in the header. The interactive seat diagram uses native controls to keep hit targets and state changes precise.
- Copy: each zone explains seat or whole-table choice according to its `allowIndividualSeatBooking` setting.

## Interaction evidence

- Selected three available B4 seats: total updated to 900 baht and the summary and buyer form showed seats 1, 2 and 3.
- B4 had two booked seats: whole-table option was disabled.
- A3 with individual booking disabled in the QA fixture: all nine seats were grouped, individual selection was disabled, and the 2,500 baht table price appeared.
- Fully available B5: switching to whole-table mode selected nine seats and displayed its 2,400 baht table price.
- The live API has individual booking enabled for zone A. The implementation follows that value, so A can also be sold by seat until an administrator changes the setting.
- The initial unauthenticated mock request returned an expected 401. Google sign-in reported that localhost is not an allowed origin for its configured client ID. Neither affected the tested authenticated booking flow.

## Comparison history

- First browser pass: hovering an already selected seat temporarily changed it to the available hover color; the drawer backdrop was darker than the concept.
- Fix: apply hover styling only to unselected seats and reduce the backdrop opacity. The later browser capture above shows all three selected seats in magenta and the map visible behind the drawer.

## Follow-up polish

- At a 1440 px viewport, compare the complete two-column map and summary against the desktop concept. The in-app browser available for this QA pass was 893 px wide.

Final result: passed
