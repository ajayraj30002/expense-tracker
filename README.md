# Expense Tracker

A professional personal expense tracking application with analytics, dark/light theme, and CSV export capabilities.

## Features

- Add, edit, and delete expenses with title, amount, category, and date
- View all expenses sorted by date (most recent first)
- Monthly summary with total spent and category breakdown
- Filter expenses by category, date range (from/to), month/year, and title search
- Analytics dashboard showing total spent, average expense, top spending category, and expense count
- Spending trend comparison (current month vs previous month)
- Export all expenses to CSV file
- Dark/Light theme toggle with persistent preference
- Responsive design for desktop, tablet, and mobile
- Input validation (amount must be positive, date cannot be in future)

## Tech Stack

| Component | Technology | Why chosen |
|-----------|-----------|-------------|
| Backend | FastAPI (Python) | Fast, automatic API docs, built-in data validation with Pydantic |
| Database | SQLite | Zero configuration, single file, runs locally without setup |
| Frontend | HTML5, CSS3, Vanilla JS | No build steps, instant refresh, full control over UI |
| Styling | Custom CSS with CSS variables | Easy theme switching, no external dependencies |

## Tradeoffs & Decisions

### Why SQLite over PostgreSQL/MySQL?
- SQLite requires no installation or credentials
- Single file makes the app truly portable
- Perfect for local-first applications
- Tradeoff: Not suitable for concurrent writes, but fine for single user

### Why Vanilla JS over React/Vue?
- Zero build step - clone and run immediately
- Faster development within 2-hour constraint
- Easier to debug without framework complexity
- Tradeoff: More manual DOM manipulation, but manageable for this scale

### Why amount stored as cents in database?
- Avoids floating point precision issues
- Ensures accurate calculations for financial data
- Display conversion happens at API layer

### Why default dark theme?
- Better for prolonged usage
- Modern aesthetic preference
- Toggle still available for light theme users

## Prerequisites

- Python 3.9 or higher installed
- pip (Python package manager)

## How to Run (Exact Commands)

### 1. Clone the repository
```bash
git clone https://github.com/ajayraj30002/expense-tracker.git
cd expense-tracker
