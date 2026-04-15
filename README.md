# Invoice Payment Proposal Agent Demo - This is for design demo purpose ONLY

A conversational AI chat agent that helps Accounts Payable managers resolve invoice payment exceptions through a guided, step-by-step workflow.

![Landing Page](https://img.shields.io/badge/status-demo-blue) ![HTML/CSS/JS](https://img.shields.io/badge/stack-HTML%2FCSS%2FJS-orange)

## Overview

PayAssist AI simulates an intelligent assistant that walks users through the entire payment exception resolution process — from identifying problematic invoices, comparing payment terms, applying business rules, to batch-processing remaining items.

## How to Use

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/wenyang33/InvoicePaymentProposal.git
   cd InvoicePaymentProposal
   ```

2. **Open in a browser:**
   ```bash
   open index.html
   ```
   Or simply double-click `index.html` in your file explorer.

### Walkthrough

The agent guides you through a **4-phase conversational workflow**:

#### Phase 1 — Find Payment Exceptions
- Click **"Find payment exceptions"** or type: *"What invoices need payment exceptions for the past 10 days?"*
- The agent shows animated filtering steps and displays a list of 6 invoices with severity indicators
- It highlights the most severe invoice and asks if you'd like to resolve it

#### Phase 2 — Resolve the Most Severe Invoice
- Click **"Yes, resolve it"** to proceed
- The agent presents a **side-by-side comparison** of two payment terms:
  - **Net 30** — 2% discount, 10-day window, saves $1,570 *(Recommended)*
  - **Net 45** — 1% discount, 20-day window, saves $785
- Click **"Confirm Net 30"** to accept the recommended option

#### Phase 3 — Business Rule Creation
- The agent detects a pattern: 4 of 6 exceptions are from **AA Corp** with the same issue
- It proposes a **business rule** to auto-resolve similar cases in the future
- Click **"Create Rule"** to activate the rule, or **"Skip for now"** to continue without it

#### Phase 4 — Batch Process Remaining Invoices
- The agent automatically processes the remaining AA Corp invoices using the new rule
- An animated progress bar shows real-time processing status
- Two invoices without discounts (Beta Industries, Gamma LLC) are flagged for manual review
- For each, the agent provides an **AI recommendation** (Reject/Approve) with reasoning
- A **final summary** shows all actions taken, total savings, and next steps

## Features

- **Guided Conversation Flow** — Natural language input with smart intent detection
- **Animated Steps** — Visual progress indicators for filtering and processing
- **Side-by-Side Comparison Cards** — Clear presentation of payment term options
- **Severity Indicators** — Color-coded badges (Critical, High, Medium) for quick prioritization
- **Business Rule Engine** — Pattern detection and automated rule creation
- **Batch Processing** — Animated progress bar for bulk invoice resolution
- **Manual Review Mode** — AI-powered recommendations for edge cases
- **Session Summary** — Complete audit trail of all actions and savings

## Tech Stack

- **HTML5** — Semantic markup
- **CSS3** — Custom properties, grid layout, animations
- **Vanilla JavaScript** — No frameworks or dependencies
- **Font Awesome 6** — Icons
- **Google Fonts (Inter)** — Typography

## File Structure

```
InvoicePaymentProposal/
├── index.html    # Main HTML structure (landing page + chat view)
├── styles.css    # Complete styling with CSS variables and animations
├── app.js        # Chat agent logic, state machine, and conversation flow
└── README.md     # This file
```

## No Build Required

This is a static HTML/CSS/JS application. No `npm install`, no build tools, no server needed — just open `index.html` in any modern browser.

## License

MIT
