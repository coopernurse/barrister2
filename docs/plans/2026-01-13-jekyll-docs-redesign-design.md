# Jekyll Documentation Redesign Design

**Date:** 2026-01-13
**Status:** Approved
**Goal:** Modernize PulseRPC2 documentation with clean, Stripe/Vercel-inspired aesthetic

## Overview

Transform the current basic Jekyll documentation into a modern, polished developer documentation site using the "Just the Docs" theme with a vibrant purple/indigo color scheme.

## Architecture & Layout

### Three-Column Layout

**Left Sidebar (Navigation)**
- Collapsible, hierarchical table of contents
- Auto-highlights the current page
- Sections: "Get Started", "IDL Guide", "Language Guides" (with subsections for Go, Java, Python, TypeScript, C#)
- Mobile-responsive with hamburger menu
- Search box integrated at the top of the sidebar

**Center Column (Main Content)**
- Optimal reading width (~700px) for comfortable line lengths
- Generous whitespace and breathing room
- Clear visual hierarchy with oversized headings
- Code syntax highlighting with vibrant purple/indigo theme

**Right Column (On This Page)**
- Auto-generated table of contents for long pages
- Quick anchors to H2/H3 headings
- Sticks as you scroll (on desktop)

### Homepage Structure

**Hero Section:**
- Gradient background: `linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)`
- Large headline: "Type-Safe JSON-RPC for Modern Applications"
- Subheadline: "Generate clients and servers from IDL definitions. Go, Java, Python, TypeScript, C#."
- Primary CTA: "Get Started" → installation guide
- Secondary CTA: "View Examples" → code samples

**Feature Highlights (6 cards):**
- Type Safety
- Multi-Language Support
- IDL-First Development
- JSON-RPC Standard
- Built-in Web UI
- Zero Runtime Dependencies

**Additional Sections:**
- "Quick Look" - Mini code example showing IDL → generated code
- "Who Uses This" / Use Cases
- Footer with GitHub link, release notes, community resources

## Color Scheme & Typography

### Primary Colors (Purple/Indigo Palette)

- **Primary:** `#6366f1` (indigo-500) - links, buttons, active states
- **Primary Dark:** `#4f46e5` (indigo-600) - hover states
- **Background:** `#ffffff` (pure white)
- **Surface:** `#f9fafb` (gray-50)
- **Border:** `#e5e7eb` (gray-200)
- **Text Primary:** `#111827` (gray-900)
- **Text Secondary:** `#6b7280` (gray-500)

### Typography

- **Font Family:** Inter or system-ui stack
- **Headings:** Semi-bold weight
- **Body:** Regular weight, 1.6 line height
- **Code:** JetBrains Mono or SF Mono (monospace)
- **Base Size:** 16px (scales up on large screens)

### Code Blocks

- **Background:** `#1e293b` (slate-800)
- **Border Radius:** 8px
- **Syntax Highlighting:** Purple-based theme matching brand

## Components & Interactive Elements

### Buttons

- **Primary:** Solid indigo (`#6366f1`), white text, rounded-md (6px), subtle shadow
- **Secondary:** White with indigo border, hover fills with indigo
- **Transitions:** Smooth 200ms ease-in-out
- **Scale Effect:** Subtle 1.02 transform on hover

### Search

- Prominent search box in sidebar (always visible on desktop)
- Keyboard shortcut: `/` to focus search
- Live search with dropdown results
- Highlight matched text in results

### Navigation

- Sidebar links: Hover indigo background, active = indigo text + left border
- Smooth scroll to anchor links
- Breadcrumbs: "Home → IDL Guide → Syntax"

### Code Improvements

- Copy button on all code blocks (top-right corner)
- Language label tab (e.g., "Go", "IDL")
- Line numbers for multi-line blocks
- Inline code: Light purple background (`#f3f4f6`), purple text (`#7c3aed`)

### Callouts/Admonitions

- Note: Blue border/icon
- Warning: Yellow/amber
- Tip: Green
- Important: Red

### Mobile

- Hamburger menu slides sidebar in from left
- Overlay dimming background
- Swipe to close gesture

## Content Structure

```
├── Home
├── Get Started
│   ├── Installation
│   └── Quickstart
├── IDL Guide
│   ├── Syntax
│   ├── Types
│   └── Validation
├── Language Guides
│   ├── Go
│   │   ├── Installation
│   │   ├── Quickstart
│   │   └── Reference
│   ├── Java
│   ├── Python
│   ├── TypeScript
│   └── C#
├── Examples
├── Advanced Topics
│   ├── Custom Validators
│   └── Error Handling
└── Changelog
```

## Technical Implementation

### Theme Configuration

**Files to Create/Modify:**
- `_sass/custom/custom.scss` - Override theme variables
- `_includes/custom/head.html` - Custom meta tags, CSS
- `_includes/custom/footer.html` - Custom footer
- `_layouts/custom/home.html` - Custom homepage
- `_config.yml` - Theme configuration
- `_data/navigation.yml` - Sidebar structure

**Key Variables:**
```scss
$primary-color: #6366f1;
$sidebar-width: 280px;
$code-background-color: #1e293b;
$base-font-family: 'Inter', system-ui, sans-serif;
```

### Development Workflow

```bash
cd docs
bundle install
bundle exec jekyll serve --livereload
# http://localhost:4000/pulserpc/
```

## Testing Checklist

- All existing content renders correctly
- Responsive breakpoints (mobile, tablet, desktop)
- Navigation links functional
- Search indexes all pages
- Code copy buttons work
- External links valid
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Lighthouse performance score

## Future Enhancements (Optional)

- Dark mode toggle
- Version selector
- "Edit on GitHub" links
- Analytics integration
