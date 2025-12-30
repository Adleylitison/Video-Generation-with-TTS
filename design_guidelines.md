# Design Guidelines: AI Video Generation Platform

## Design Approach
**Selected Approach:** Design System with Creative Tool References
**Justification:** This is a utility-focused productivity application requiring efficient workflows for video creation. Drawing inspiration from modern creative tools (Runway ML, Descript, CapCut) while maintaining a clean, functional interface.

**Core Principles:**
- Clarity over decoration - users need to focus on content creation
- Progressive disclosure - show complexity only when needed
- Real-time feedback - clear status of processing stages
- Professional aesthetic that builds trust in AI-powered outputs

---

## Color Palette

**Dark Mode (Primary):**
- Background Base: 220 15% 8%
- Surface: 220 15% 12%
- Surface Elevated: 220 15% 16%
- Border Subtle: 220 10% 20%
- Border: 220 10% 25%

**Accent & Status Colors:**
- Primary Action: 250 85% 65% (purple/blue for main CTAs)
- Success (processing complete): 142 70% 50%
- Warning (processing): 38 95% 60%
- Error: 0 70% 60%
- Info: 210 80% 60%

**Text Colors (Dark Mode):**
- Primary Text: 220 10% 95%
- Secondary Text: 220 8% 70%
- Tertiary Text: 220 8% 50%

---

## Typography

**Font Stack:**
- Interface: Inter (Google Fonts) - 400, 500, 600 weights
- Monospace (API keys, code): JetBrains Mono - 400, 500 weights

**Type Scale:**
- Hero/Page Title: text-3xl font-semibold (30px)
- Section Headers: text-xl font-semibold (20px)
- Card Titles: text-lg font-medium (18px)
- Body: text-base (16px)
- Small/Meta: text-sm (14px)
- Tiny/Labels: text-xs (12px)

---

## Layout System

**Spacing Primitives:** Consistent use of 2, 4, 6, 8, 12, 16, 24 units
- Micro spacing (gaps, padding): 2-4
- Component internal: 4-6
- Component external/card padding: 6-8
- Section spacing: 12-16
- Page margins: 16-24

**Grid Structure:**
- Two-column layout for main workspace: 40% (script/controls) | 60% (preview/output)
- Single column on mobile with tabbed interface
- Max container width: Full screen for workspace apps
- Sidebar width: 280px-320px when present

---

## Component Library

### Navigation
- Top bar: Full-width, h-16, contains logo, project name, status indicator, user menu
- Sticky positioned for consistent access
- Clean separation with border-b

### Script Editor
- Full-height textarea with syntax highlighting feel
- Line numbers optional
- Character/word count at bottom
- Monospace font for script input
- Clear visual distinction between emotive/informative mode

### Video Type Selector
- Segmented control/radio group design
- Two options: "Emotive/Story" | "Informative"
- Visual icon + label for each type
- Active state with background fill and border

### API Key Management
- Collapsible section with lock icon
- Password-style inputs with show/hide toggle
- Per-service fields: Sora 2, Gemini, Pipecat
- Save state indicator (unsaved changes warning)

### Processing Status
- Multi-stage progress indicator showing:
  1. Analyzing Script
  2. Generating Audio (TTS)
  3. Creating Music
  4. Generating Video
  5. Composing Final Video
- Each stage: icon + label + status (queued/processing/complete)
- Overall progress bar at top
- Estimated time remaining

### Video Preview
- 1080x1920 aspect ratio container (9:16)
- Centered in preview area
- Controls: play/pause, timeline scrubber, volume
- Quality selector (if applicable)
- Fullscreen option

### Action Buttons
- Primary: "Generate Video" - large, prominent, disabled until script + APIs ready
- Secondary: "Download Video" - appears only when complete
- Tertiary: "New Project", "Settings"

### Cards & Containers
- Rounded corners: rounded-lg (8px)
- Subtle borders: 1px solid border color
- Shadow: Minimal, only on elevated surfaces (shadow-sm)
- Padding: p-6 for content cards

### Form Elements
- Input fields: Consistent height h-10, rounded-md
- Focus states: ring-2 ring-primary with ring-offset
- Labels: text-sm font-medium mb-2
- Helper text: text-xs text-tertiary mt-1

### Toast Notifications
- Bottom-right positioning
- 4 second auto-dismiss
- Icon + message + close button
- Slide-in animation

---

## Interactions & Animations

**Minimal Animation Philosophy:**
- Button hover: Subtle brightness increase (5-10%)
- Focus states: Ring appearance only
- Loading: Smooth spinner or indeterminate progress bar
- Page transitions: None (instant)
- Progress updates: Smooth number/bar transitions (200ms)

**Micro-interactions:**
- API key visibility toggle: Instant text transform
- Stage completion: Checkmark fade-in
- Toast entrance/exit: 200ms slide + fade

---

## Responsive Behavior

**Desktop (1024px+):**
- Full two-column layout
- Video preview at comfortable viewing size
- All controls visible simultaneously

**Tablet (768-1023px):**
- Narrower columns, maintain two-column
- Slightly smaller preview

**Mobile (<768px):**
- Single column stack
- Tabs for switching between "Script" and "Preview"
- Sticky action buttons at bottom
- Collapsible API settings

---

## Images & Media

**No large hero images** - This is a functional workspace application.

**Icons:**
- Use Heroicons (outline style) via CDN
- 20px (w-5 h-5) for inline icons
- 24px (w-6 h-6) for card headers
- Consistent stroke width

**Video Preview Placeholder:**
- Dark gradient background with play icon when no video
- "No video generated yet" message
- Subtle grid pattern overlay

---

## Special Considerations

**Video Processing Feedback:**
- Real-time stage progression
- Clear error messaging if API fails
- Retry options for failed stages
- Cancel generation option during processing

**Script Input:**
- Autosave functionality (save draft indicator)
- Subtle line highlighting on focus
- Paste formatting cleanup

**Performance:**
- Lazy load video preview
- Efficient progress polling (2-3 second intervals)
- Optimistic UI updates where possible

This design creates a professional, focused workspace that prioritizes functionality while maintaining modern aesthetics appropriate for an AI-powered creative tool.