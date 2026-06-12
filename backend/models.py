from pydantic import BaseModel, Field, validator
from datetime import date
from enum import Enum

class Category(str, Enum):
    food = "food"
    transport = "transport"
    shopping = "shopping"
    bills = "bills"
    entertainment = "entertainment"
    other = "other"

class ExpenseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    amount: float = Field(..., gt=0, le=1000000)  # >0 and max 10 lakhs
    category: Category
    date: date
    
    @validator('title')
    def title_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Title cannot be empty')
        return v.strip()
    
    @validator('amount')
    def amount_positive(cls, v):
        if v <= 0:
            raise ValueError('Amount must be greater than 0')
        return round(v, 2)
    
    @validator('date')
    def date_not_future(cls, v):
        if v > date.today():
            raise ValueError('Date cannot be in the future')
        return v

class Expense(ExpenseCreate):
    id: int