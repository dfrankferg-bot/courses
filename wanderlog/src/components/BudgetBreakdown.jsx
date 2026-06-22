import { budgetByCategory } from '../store.jsx'
import { categoryOf } from '../data/categories.js'

export default function BudgetBreakdown({ trip, total, onClose }) {
  const rows = budgetByCategory(trip)
  const max = rows.length ? rows[0].amount : 0

  return (
    <div className="budget-pop" onClick={(e) => e.stopPropagation()}>
      <div className="budget-pop-head">
        <span>Budget breakdown</span>
        <button className="link-btn" onClick={onClose}>Close</button>
      </div>

      {rows.length === 0 && (
        <p className="muted small">Add a cost to any stop to see it here.</p>
      )}

      {rows.map(({ category, amount }) => {
        const cat = categoryOf(category)
        const pct = total ? Math.round((amount / total) * 100) : 0
        return (
          <div className="budget-row" key={category}>
            <div className="budget-row-top">
              <span>{cat.emoji} {cat.label}</span>
              <span className="budget-row-amt">${amount.toLocaleString()} <span className="muted">· {pct}%</span></span>
            </div>
            <div className="budget-bar">
              <div
                className="budget-bar-fill"
                style={{ width: `${max ? (amount / max) * 100 : 0}%`, background: cat.color }}
              />
            </div>
          </div>
        )
      })}

      {rows.length > 0 && (
        <div className="budget-total">
          <span>Total</span>
          <span>${total.toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}
