from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from datetime import date
from typing import Optional
import time
import logging
import os

from .models import ExpenseCreate, Expense, Category
from .database import (
    init_db, add_expense_db, get_all_expenses_db, get_expense_by_id_db,
    update_expense_db, delete_expense_db, get_monthly_summary_db, filter_expenses_db
)

app = FastAPI()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log incoming request
    logger.info(f"→ {request.method} {request.url.path}")
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    duration = time.time() - start_time
    
    # Log response
    logger.info(f"← {request.method} {request.url.path} - Status: {response.status_code} - {duration:.3f}s")
    
    # Add duration header
    response.headers["X-Process-Time"] = str(duration)
    
    return response

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()
    logger.info("Database initialized")

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": date.today().isoformat()}

# API Endpoints
@app.get("/expenses", status_code=200)
def get_expenses(
    category: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    title_search: Optional[str] = Query(None)
):
    expenses = filter_expenses_db(category, date_from, date_to, title_search)
    return expenses

@app.post("/expenses", status_code=201)
def create_expense(expense: ExpenseCreate):
    try:
        expense_id = add_expense_db(
            expense.title,
            expense.amount,
            expense.category.value,
            expense.date.isoformat()
        )
        logger.info(f"Created expense {expense_id}: {expense.title}")
        return {"id": expense_id, **expense.dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/expenses/{expense_id}", status_code=200)
def update_expense(expense_id: int, expense: ExpenseCreate):
    existing = get_expense_by_id_db(expense_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    try:
        update_expense_db(
            expense_id,
            expense.title,
            expense.amount,
            expense.category.value,
            expense.date.isoformat()
        )
        logger.info(f"Updated expense {expense_id}: {expense.title}")
        return {"id": expense_id, **expense.dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: int):
    existing = get_expense_by_id_db(expense_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    delete_expense_db(expense_id)
    logger.info(f"Deleted expense {expense_id}")
    return None

@app.get("/summary/monthly", status_code=200)
def get_monthly_summary(year: int, month: int):
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")
    if year < 2000 or year > 2100:
        raise HTTPException(status_code=400, detail="Year must be between 2000 and 2100")
    
    return get_monthly_summary_db(year, month)

@app.get("/analytics", status_code=200)
def get_analytics():
    from .database import get_db_connection
    
    conn = get_db_connection()
    
    total_all_cents = conn.execute("SELECT COALESCE(SUM(amount_cents), 0) FROM expenses").fetchone()[0]
    avg_cents = conn.execute("SELECT COALESCE(AVG(amount_cents), 0) FROM expenses").fetchone()[0]
    
    top_category = conn.execute("""
        SELECT category, COUNT(*) as count 
        FROM expenses 
        GROUP BY category 
        ORDER BY count DESC 
        LIMIT 1
    """).fetchone()
    
    top_spending_category = conn.execute("""
        SELECT category, SUM(amount_cents) as total 
        FROM expenses 
        GROUP BY category 
        ORDER BY total DESC 
        LIMIT 1
    """).fetchone()
    
    highest_expense = conn.execute("""
        SELECT title, amount_cents, date 
        FROM expenses 
        ORDER BY amount_cents DESC 
        LIMIT 1
    """).fetchone()
    
    total_count = conn.execute("SELECT COUNT(*) FROM expenses").fetchone()[0]
    
    from datetime import datetime, timedelta
    
    today = date.today()
    current_month_start = date(today.year, today.month, 1)
    
    if today.month == 1:
        prev_month_start = date(today.year - 1, 12, 1)
        prev_month_end = date(today.year, 1, 1)
    else:
        prev_month_start = date(today.year, today.month - 1, 1)
        prev_month_end = date(today.year, today.month, 1)
    
    current_month_cents = conn.execute("""
        SELECT COALESCE(SUM(amount_cents), 0) FROM expenses 
        WHERE date >= ? AND date <= ?
    """, (current_month_start.isoformat(), today.isoformat())).fetchone()[0]
    
    prev_month_cents = conn.execute("""
        SELECT COALESCE(SUM(amount_cents), 0) FROM expenses 
        WHERE date >= ? AND date < ?
    """, (prev_month_start.isoformat(), prev_month_end.isoformat())).fetchone()[0]
    
    conn.close()
    
    trend_percentage = 0
    if prev_month_cents > 0:
        trend_percentage = round(((current_month_cents - prev_month_cents) / prev_month_cents) * 100, 1)
    
    return {
        "total_spent_all_time": round(total_all_cents / 100, 2),
        "average_expense": round(avg_cents / 100, 2),
        "most_frequent_category": top_category[0] if top_category else None,
        "highest_spending_category": top_spending_category[0] if top_spending_category else None,
        "highest_expense": {
            "title": highest_expense[0] if highest_expense else None,
            "amount": round(highest_expense[1] / 100, 2) if highest_expense else 0,
            "date": highest_expense[2] if highest_expense else None
        } if highest_expense else None,
        "total_expenses_count": total_count,
        "spending_trend": {
            "last_30_days": round(current_month_cents / 100, 2),
            "previous_30_days": round(prev_month_cents / 100, 2),
            "percentage_change": trend_percentage,
            "direction": "up" if trend_percentage > 0 else "down" if trend_percentage < 0 else "stable"
        }
    }

# Serve frontend static files
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
