const API_URL = 'http://localhost:8000';

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

const savedTheme = localStorage.getItem('theme') || 'dark-theme';
body.className = savedTheme;
themeToggle.textContent = savedTheme === 'dark-theme' ? 'Light' : 'Dark';

themeToggle.addEventListener('click', () => {
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        localStorage.setItem('theme', 'light-theme');
        themeToggle.textContent = 'Dark';
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark-theme');
        themeToggle.textContent = 'Light';
    }
});

// Set today's date as default
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    const currentYear = new Date().getFullYear();
    document.getElementById('filterYear').value = currentYear;
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = monthNames[new Date().getMonth()];
    document.getElementById('currentMonth').textContent = currentMonth;
    
    loadExpenses();
    loadMonthlySummary();
    loadAnalytics();
});

// Validate amount
function validateAmount(amount, errorElementId = 'amountError', inputElementId = 'amount') {
    const amountField = document.getElementById(inputElementId);
    const errorDiv = document.getElementById(errorElementId);
    
    if (isNaN(amount) || amount <= 0) {
        if (amountField) amountField.classList.add('error');
        if (errorDiv) errorDiv.style.display = 'block';
        return false;
    }
    if (amountField) amountField.classList.remove('error');
    if (errorDiv) errorDiv.style.display = 'none';
    return true;
}

// Handle main form submission (Add Expense)
document.getElementById('expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('amount').value);
    
    if (!validateAmount(amount)) {
        return;
    }
    
    const editId = document.getElementById('editId').value;
    const expense = {
        title: document.getElementById('title').value,
        amount: amount,
        category: document.getElementById('category').value,
        date: document.getElementById('date').value
    };
    
    try {
        let response;
        if (editId) {
            response = await fetch(`${API_URL}/expenses/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expense)
            });
        } else {
            response = await fetch(`${API_URL}/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expense)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error saving expense');
        }
        
        resetForm();
        loadExpenses();
        loadMonthlySummary();
        loadAnalytics();
    } catch (error) {
        console.error('Error saving expense:', error);
        alert(error.message);
    }
});

// Cancel edit button
document.getElementById('cancelBtn').addEventListener('click', resetForm);

function resetForm() {
    document.getElementById('expenseForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('formTitle').textContent = 'Add New Expense';
    document.getElementById('submitBtn').textContent = 'Add Expense';
    document.getElementById('cancelBtn').style.display = 'none';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    document.getElementById('amount').classList.remove('error');
    document.getElementById('amountError').style.display = 'none';
}

// Load analytics
async function loadAnalytics() {
    try {
        const response = await fetch(`${API_URL}/analytics`);
        const analytics = await response.json();
        
        document.getElementById('totalSpent').innerHTML = `₹${analytics.total_spent_all_time.toFixed(2)}`;
        document.getElementById('avgExpense').innerHTML = `₹${analytics.average_expense.toFixed(2)}`;
        
        let topCategoryDisplay = '-';
        if (analytics.highest_spending_category) {
            topCategoryDisplay = analytics.highest_spending_category.charAt(0).toUpperCase() + analytics.highest_spending_category.slice(1);
        }
        document.getElementById('topCategory').innerHTML = topCategoryDisplay;
        document.getElementById('totalCount').innerHTML = analytics.total_expenses_count;
        
        if (analytics.total_expenses_count > 0 && analytics.spending_trend.last_30_days > 0) {
            document.getElementById('trendCard').style.display = 'block';
            const trendValue = document.getElementById('trendValue');
            const percentage = Math.abs(analytics.spending_trend.percentage_change);
            const direction = analytics.spending_trend.percentage_change > 0 ? 'positive' : 'negative';
            trendValue.innerHTML = `${analytics.spending_trend.percentage_change > 0 ? '↑' : '↓'} ${percentage}%`;
            trendValue.className = `trend-value ${direction}`;
            
            const maxAmount = Math.max(analytics.spending_trend.last_30_days, analytics.spending_trend.previous_30_days);
            const barWidth = maxAmount > 0 ? (analytics.spending_trend.last_30_days / maxAmount) * 100 : 0;
            document.getElementById('trendBar').style.width = `${barWidth}%`;
            document.getElementById('prevAmount').innerHTML = `₹${analytics.spending_trend.previous_30_days.toFixed(2)}`;
            document.getElementById('currentAmount').innerHTML = `₹${analytics.spending_trend.last_30_days.toFixed(2)}`;
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Load expenses with filters
async function loadExpenses() {
    const category = document.getElementById('filterCategory').value;
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;
    const month = document.getElementById('filterMonth').value;
    const year = document.getElementById('filterYear').value;
    const titleSearch = document.getElementById('filterTitle').value;
    
    let url = `${API_URL}/expenses?`;
    if (category && category !== 'all') url += `category=${category}&`;
    if (dateFrom) url += `date_from=${dateFrom}&`;
    if (dateTo) url += `date_to=${dateTo}&`;
    if (titleSearch) url += `title_search=${encodeURIComponent(titleSearch)}&`;
    
    try {
        const response = await fetch(url);
        let expenses = await response.json();
        
        if (month) {
            expenses = expenses.filter(exp => {
                const expDate = new Date(exp.date);
                return expDate.getMonth() + 1 === parseInt(month) && 
                       expDate.getFullYear() === parseInt(year);
            });
        }
        
        displayExpenses(expenses);
    } catch (error) {
        console.error('Error loading expenses:', error);
        document.getElementById('expensesList').innerHTML = '<div class="empty-state">Failed to load expenses</div>';
    }
}

// Display expenses in table
function displayExpenses(expenses) {
    const container = document.getElementById('expensesList');
    const countSpan = document.getElementById('expenseCount');
    
    countSpan.textContent = `${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`;
    
    if (!expenses || expenses.length === 0) {
        container.innerHTML = '<div class="empty-state">No expenses found</div>';
        return;
    }
    
    let html = ' <div style="overflow-x: auto;"> <table> <thead> <tr> <th>Date</th> <th>Title</th> <th>Category</th> <th>Amount</th> <th>Actions</th> </tr> </thead> <tbody>';
    
    for (const expense of expenses) {
        html += `<tr>
                    <td>${expense.date}</td>
                    <td><strong>${escapeHtml(expense.title)}</strong></td>
                    <td>${expense.category}</td>
                    <td>₹${expense.amount.toFixed(2)}</td>
                    <td class="action-buttons">
                        <button class="btn-edit" onclick="editExpense(${expense.id})">Edit</button>
                        <button class="btn-delete" onclick="deleteExpense(${expense.id})">Delete</button>
                    </td>
                </tr>`;
    }
    
    html += '</tbody> </table> </div>';
    container.innerHTML = html;
}

// Edit Modal functions
function showEditModal(expense) {
    document.getElementById('editExpenseId').value = expense.id;
    document.getElementById('editTitle').value = expense.title;
    document.getElementById('editAmount').value = expense.amount;
    document.getElementById('editCategory').value = expense.category;
    document.getElementById('editDate').value = expense.date;
    document.getElementById('editModal').classList.add('show');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('show');
}

// Handle edit form submission
document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('editExpenseId').value;
    const amount = parseFloat(document.getElementById('editAmount').value);
    
    if (!validateAmount(amount, 'editAmountError', 'editAmount')) {
        return;
    }
    
    const expense = {
        title: document.getElementById('editTitle').value,
        amount: amount,
        category: document.getElementById('editCategory').value,
        date: document.getElementById('editDate').value
    };
    
    try {
        const response = await fetch(`${API_URL}/expenses/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expense)
        });
        
        if (response.ok) {
            closeEditModal();
            loadExpenses();
            loadMonthlySummary();
            loadAnalytics();
        } else {
            const error = await response.json();
            alert(error.detail || 'Error updating expense');
        }
    } catch (error) {
        console.error('Error updating expense:', error);
        alert('Error updating expense');
    }
});

// Close modal when clicking outside
document.getElementById('editModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('editModal')) {
        closeEditModal();
    }
});

// Edit expense - opens modal
window.editExpense = async (id) => {
    try {
        const response = await fetch(`${API_URL}/expenses?`);
        const expenses = await response.json();
        const expense = expenses.find(e => e.id === id);
        
        if (expense) {
            showEditModal(expense);
        }
    } catch (error) {
        console.error('Error loading expense:', error);
        alert('Error loading expense for editing');
    }
};

// Delete expense
window.deleteExpense = async (id) => {
    if (confirm('Delete this expense?')) {
        try {
            const response = await fetch(`${API_URL}/expenses/${id}`, { method: 'DELETE' });
            if (response.ok) {
                loadExpenses();
                loadMonthlySummary();
                loadAnalytics();
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('Error deleting expense');
        }
    }
};

// Load monthly summary
async function loadMonthlySummary() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    
    try {
        const response = await fetch(`${API_URL}/summary/monthly?year=${year}&month=${month}`);
        const summary = await response.json();
        
        let html = `
            <div class="summary-total">
                <h4>Total Spent This Month</h4>
                <div class="amount">₹${summary.total.toFixed(2)}</div>
            </div>
            <div class="category-breakdown">
                <h4>Breakdown by Category</h4>
        `;
        
        if (Object.keys(summary.breakdown).length === 0) {
            html += '<div class="empty-state">No expenses this month</div>';
        } else {
            for (const [category, amount] of Object.entries(summary.breakdown)) {
                html += `<div class="category-item">
                            <span class="category-name">${category}</span>
                            <span class="category-amount">₹${amount.toFixed(2)}</span>
                        </div>`;
            }
        }
        
        html += '</div>';
        document.getElementById('monthlySummary').innerHTML = html;
    } catch (error) {
        console.error('Error loading summary:', error);
        document.getElementById('monthlySummary').innerHTML = '<div class="empty-state">Error loading summary</div>';
    }
}

// Export to CSV
document.getElementById('exportCSV').addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_URL}/expenses?`);
        const expenses = await response.json();
        
        if (expenses.length === 0) {
            alert('No expenses to export');
            return;
        }
        
        let csvContent = 'Date,Title,Category,Amount (INR)\n';
        for (const expense of expenses) {
            csvContent += `"${expense.date}","${escapeCsv(expense.title)}","${expense.category}",${expense.amount.toFixed(2)}\n`;
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert(`Exported ${expenses.length} expenses`);
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        alert('Error exporting to CSV');
    }
});

function escapeCsv(text) {
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return text.replace(/"/g, '""');
    }
    return text;
}

// Apply filters
document.getElementById('applyFilters').addEventListener('click', () => {
    loadExpenses();
});

// Reset filters
document.getElementById('resetFilters').addEventListener('click', () => {
    document.getElementById('filterCategory').value = 'all';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    document.getElementById('filterMonth').value = '';
    document.getElementById('filterYear').value = new Date().getFullYear();
    document.getElementById('filterTitle').value = '';
    loadExpenses();
});

// Real-time amount validation for main form
document.getElementById('amount').addEventListener('input', (e) => {
    const amount = parseFloat(e.target.value);
    validateAmount(amount, 'amountError', 'amount');
});

// Real-time amount validation for edit modal
if (document.getElementById('editAmount')) {
    document.getElementById('editAmount').addEventListener('input', (e) => {
        const amount = parseFloat(e.target.value);
        validateAmount(amount, 'editAmountError', 'editAmount');
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}