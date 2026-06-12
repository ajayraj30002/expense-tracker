import sqlite3
from datetime import date, datetime
from typing import List, Optional

DB_NAME = "expenses.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            amount_cents INTEGER NOT NULL,
            category TEXT NOT NULL,
            date TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def add_expense_db(title: str, amount: float, category: str, expense_date: str):
    amount_cents = int(amount * 100)
    conn = get_db_connection()
    cursor = conn.execute(
        "INSERT INTO expenses (title, amount_cents, category, date) VALUES (?, ?, ?, ?)",
        (title, amount_cents, category, expense_date)
    )
    conn.commit()
    expense_id = cursor.lastrowid
    conn.close()
    return expense_id

def get_all_expenses_db():
    conn = get_db_connection()
    expenses = conn.execute("SELECT id, title, amount_cents, category, date FROM expenses ORDER BY date DESC").fetchall()
    conn.close()
    
    # Convert to list of dicts with amount in rupees
    result = []
    for exp in expenses:
        result.append({
            "id": exp[0],
            "title": exp[1],
            "amount": round(exp[2] / 100, 2),
            "category": exp[3],
            "date": exp[4]
        })
    return result

def get_expense_by_id_db(expense_id: int):
    conn = get_db_connection()
    expense = conn.execute("SELECT id, title, amount_cents, category, date FROM expenses WHERE id = ?", (expense_id,)).fetchone()
    conn.close()
    
    if expense:
        return {
            "id": expense[0],
            "title": expense[1],
            "amount": round(expense[2] / 100, 2),
            "category": expense[3],
            "date": expense[4]
        }
    return None

def update_expense_db(expense_id: int, title: str, amount: float, category: str, expense_date: str):
    amount_cents = int(amount * 100)
    conn = get_db_connection()
    conn.execute(
        "UPDATE expenses SET title = ?, amount_cents = ?, category = ?, date = ? WHERE id = ?",
        (title, amount_cents, category, expense_date, expense_id)
    )
    conn.commit()
    conn.close()

def delete_expense_db(expense_id: int):
    conn = get_db_connection()
    conn.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    conn.commit()
    conn.close()

def get_monthly_summary_db(year: int, month: int):
    conn = get_db_connection()
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year+1}-01-01"
    else:
        end_date = f"{year}-{month+1:02d}-01"
    
    expenses = conn.execute(
        "SELECT amount_cents, category FROM expenses WHERE date >= ? AND date < ?",
        (start_date, end_date)
    ).fetchall()
    conn.close()
    
    total_cents = sum(e[0] for e in expenses)
    category_breakdown = {}
    for expense in expenses:
        cat = expense[1]
        category_breakdown[cat] = category_breakdown.get(cat, 0) + expense[0]
    
    return {
        "total": round(total_cents / 100, 2),
        "breakdown": {k: round(v/100, 2) for k, v in category_breakdown.items()}
    }

def filter_expenses_db(category: Optional[str], date_from: Optional[str], date_to: Optional[str], title_search: Optional[str]):
    conn = get_db_connection()
    query = "SELECT id, title, amount_cents, category, date FROM expenses WHERE 1=1"
    params = []
    
    if category and category != "all":
        query += " AND category = ?"
        params.append(category)
    
    if date_from:
        query += " AND date >= ?"
        params.append(date_from)
    
    if date_to:
        query += " AND date <= ?"
        params.append(date_to)
    
    if title_search:
        query += " AND title LIKE ?"
        params.append(f"%{title_search}%")
    
    query += " ORDER BY date DESC"
    
    expenses = conn.execute(query, params).fetchall()
    conn.close()
    
    # Convert to list of dicts with amount in rupees
    result = []
    for exp in expenses:
        result.append({
            "id": exp[0],
            "title": exp[1],
            "amount": round(exp[2] / 100, 2),
            "category": exp[3],
            "date": exp[4]
        })
    return result