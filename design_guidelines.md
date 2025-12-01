# PRISM Post-Production Management Software - Design Guidelines

## Design Approach

**Selected Framework**: Material Design + Linear-inspired aesthetics
**Rationale**: Enterprise productivity application requiring robust component patterns, clear information hierarchy, and data-dense interfaces. Material Design provides proven patterns for tables, forms, and data visualization while Linear's aesthetic brings modern polish to enterprise software.

**Core Principles**:
- Information clarity over visual flair
- Efficient workflows with minimal clicks
- Scannable data presentation
- Consistent interaction patterns
- Professional, trustworthy appearance

---

## Typography System

**Font Family**: 
- Primary: Inter (via Google Fonts CDN) - UI text, forms, tables
- Monospace: JetBrains Mono - dates, times, numerical data

**Type Scale**:
- Display (Calendar Headers, Page Titles): text-2xl, font-semibold
- Section Headers: text-lg, font-semibold  
- Body/Form Labels: text-sm, font-medium
- Table Content: text-sm, font-normal
- Helper Text: text-xs, font-normal
- Metadata/Timestamps: text-xs, font-normal, monospace

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-4, p-6
- Section spacing: space-y-6, space-y-8
- Form field spacing: space-y-4
- Table cell padding: p-3
- Modal padding: p-6

**Grid System**:
- Dashboard: Fixed sidebar (w-64) + fluid main content
- Forms: Single column (max-w-2xl) for readability
- Master lists: Full-width tables with horizontal scroll
- Reports: Full-width with filter sidebar (w-80)

**Container Widths**:
- Forms/Modals: max-w-2xl
- Calendar: Full width with max-w-7xl
- Reports/Tables: Full width (w-full)
- Detail panels: max-w-4xl

---

## Component Library

### Navigation Structure

**Sidebar** (Fixed left, full height):
- Company selector dropdown (top)
- Date picker widget
- User info chip
- Navigation menu with icons (Heroicons)
  - Operations (expanded by default)
  - Masters
  - Reports  
  - Utility
  - Windows
  - Exit
- Collapsible sections with subtle expand/collapse indicators

**Top Bar** (Minimal):
- Breadcrumb navigation
- Quick actions (context-specific)
- Notification indicator

### Calendar Interface (Booking Module)

**Monthly Grid View**:
- 7-column grid (Mon-Sun)
- Day cells with min-h-24 for multiple bookings
- Each booking: Compact card showing room, customer, editor, time
- Color-coded left border (4px) for status
- Hover: Elevation shadow + booking log tooltip
- Empty state: Subtle dashed border with "Add booking" prompt

**Booking Cards** (within calendar):
- Compact design: p-2, rounded-md
- Text hierarchy: Customer (font-semibold), Project (text-xs), Time (monospace, text-xs)
- Truncate long names with ellipsis
- Click to edit, right-click for context menu (cancel, view logs)

**Legend/Filters** (above calendar):
- Checkbox: "Hide Cancelled Bookings"
- Status filter chips
- Quick date navigation (prev/next month, today)

### Forms & Modals

**Modal Structure**:
- Overlay with backdrop-blur-sm
- Centered modal: max-w-2xl, rounded-lg, shadow-2xl
- Header: Title + close button (X icon, top-right)
- Body: p-6, space-y-4
- Footer: Flex row, justify-end, gap-3 (Cancel + Primary action)

**Form Fields**:
- Full-width inputs with floating labels
- Group related fields in sections with dividers
- Required field indicator (asterisk)
- Inline validation messages (text-xs, below field)
- Autocomplete dropdowns for customer/project/editor selection
- Time pickers: Custom component with 30-min intervals
- Checkbox groups: grid-cols-2 for compact layout

**Multi-Contact Management** (Customer Master):
- Repeatable field groups with "Add Contact" button
- Each contact: Card with border, p-4, with delete icon (top-right)

### Data Tables

**Table Structure**:
- Full-width, border, rounded-lg
- Sticky header (sticky top-0)
- Alternating row backgrounds for scanability
- Column headers: Sortable (with arrow icons), filterable (search icon)
- Cell padding: px-4 py-3
- Actions column (right-aligned): Icon buttons for edit/delete
- Row hover: Subtle background change

**Table Features**:
- Pagination footer (rows per page selector + page navigation)
- Bulk actions toolbar (appears when rows selected)
- Export button (top-right): Download icon with dropdown (Excel/CSV)
- Search bar (top): Full-text search across all columns

### Reports Interface

**Layout**: Two-column (filter sidebar + results)

**Filter Sidebar** (w-80):
- Stacked filter controls
- Date range picker
- Customer dropdown
- Status checkboxes
- "Apply Filters" button (sticky at bottom)
- "Clear All" link

**Results Area**:
- Summary cards (if applicable): Grid of 3-4 metric cards
- Main table/chart area
- Export/Print buttons (top-right)

### Chalan/Invoice View

**Print Format**:
- A4-sized container (max-w-4xl, mx-auto)
- Company header with logo placeholder
- Invoice details table
- Project items table
- Signature blocks (5 positions)
- Print button (top-right, no-print class)

**Revision Interface**:
- Side-by-side comparison (original | revised)
- Highlight changed fields
- Revision history timeline (left sidebar)

### Utility (User Rights Management)

**Access Control Matrix**:
- Table with modules as rows, permissions as columns
- Checkbox cells for enable/disable
- Visual grouping by module sections
- Save/Discard buttons (sticky footer)

---

## Interaction Patterns

**Status Color Coding** (left border/badge):
- Cancelled: 4px left border
- Planning: 4px left border
- Tentative: 4px left border
- Confirmed: 4px left border

**Feedback**:
- Success actions: Toast notification (top-right, auto-dismiss)
- Errors: Inline form validation + error modal for critical failures
- Loading states: Skeleton screens for tables, spinner for forms
- Confirmations: Modal for destructive actions (delete, cancel booking)

**Empty States**:
- Centered illustration placeholder + "No data" message
- Primary action button ("Add First Customer/Project")

---

## Icons

**Library**: Heroicons (via CDN)
- Navigation: Outline style
- Actions: Outline style (default), Solid on hover
- Status indicators: Mini icons
- Data tables: Mini icons for actions

---

## Accessibility

- Focus rings on all interactive elements (ring-2, ring-offset-2)
- Keyboard navigation: Tab order follows visual flow
- Form labels: Properly associated with inputs
- Table headers: scope attributes
- Modal: Focus trap, ESC to close, ARIA labels
- Color-blind safe: Never use color alone for status (combine with icons/text)

---

## Responsive Behavior

**Desktop-First** (optimized for 1440px+):
- Sidebar always visible
- Tables with horizontal scroll
- Modals: max-w-2xl

**Tablet** (768px - 1024px):
- Collapsible sidebar (hamburger menu)
- Forms: Same layout
- Tables: Horizontal scroll

**Mobile** (< 768px):
- Bottom navigation for primary modules
- Calendar: Week view (instead of month)
- Forms: Stack all fields
- Tables: Card view (stack row data)

---

## Animation

**Minimal, Purposeful Only**:
- Modal: Fade in backdrop + scale up content (200ms)
- Dropdown: Slide down (150ms)
- Toast: Slide in from top (200ms)
- NO hover animations, parallax, or scroll-triggered effects