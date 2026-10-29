// Default category set seeded for every new user

export interface DefaultCategory {
  name: string
  icon: string
  color: string
  type: 'EXPENSE' | 'INCOME'
  isDefault?: boolean
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Food & Dining', icon: 'UtensilsCrossed', color: '#f97316', type: 'EXPENSE' },
  { name: 'Groceries', icon: 'ShoppingBasket', color: '#22c55e', type: 'EXPENSE' },
  { name: 'Transport', icon: 'Car', color: '#0ea5e9', type: 'EXPENSE' },
  { name: 'Bills & Utilities', icon: 'ReceiptText', color: '#64748b', type: 'EXPENSE' },
  { name: 'Rent & Home', icon: 'Home', color: '#8b5cf6', type: 'EXPENSE' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899', type: 'EXPENSE' },
  { name: 'Entertainment', icon: 'Clapperboard', color: '#f43f5e', type: 'EXPENSE' },
  { name: 'Subscriptions', icon: 'Repeat', color: '#14b8a6', type: 'EXPENSE' },
  { name: 'Health & Fitness', icon: 'HeartPulse', color: '#ef4444', type: 'EXPENSE' },
  { name: 'Education', icon: 'GraduationCap', color: '#eab308', type: 'EXPENSE' },
  { name: 'Travel', icon: 'Plane', color: '#06b6d4', type: 'EXPENSE' },
  { name: 'Personal Care', icon: 'Sparkles', color: '#d946ef', type: 'EXPENSE' },
  { name: 'Gifts & Donations', icon: 'Gift', color: '#f59e0b', type: 'EXPENSE' },
  { name: 'Other', icon: 'CircleEllipsis', color: '#94a3b8', type: 'EXPENSE', isDefault: true },
  { name: 'Salary', icon: 'Banknote', color: '#10b981', type: 'INCOME' },
  { name: 'Freelance', icon: 'Laptop', color: '#34d399', type: 'INCOME' },
  { name: 'Investments', icon: 'TrendingUp', color: '#84cc16', type: 'INCOME' },
]
