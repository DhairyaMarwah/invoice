// Whitebird product catalog — contracts are tagged with one product;
// the dashboard and reports roll revenue up by category.

export interface Product {
  key: string;
  label: string;
  desc: string;
}

export interface ProductCategory {
  key: string;
  label: string;
  tone: 'info' | 'pur' | 'warn';
  products: Product[];
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    key: 'pegasus',
    label: 'Pegasus',
    tone: 'info',
    products: [
      { key: 'pegasus-learn', label: 'Pegasus Learn', desc: 'Learning Management System' },
      { key: 'pegasus-code', label: 'Pegasus Code', desc: 'Coding Platform' },
      { key: 'pegasus-labs', label: 'Pegasus Labs', desc: 'Virtual Labs' },
      { key: 'pegasus-assess', label: 'Pegasus Assess', desc: 'Assessment Platform' },
    ],
  },
  {
    key: 'iris',
    label: 'Iris',
    tone: 'pur',
    products: [
      { key: 'iris-discover', label: 'Iris Discover', desc: 'AI-Native / Generative University Website' },
      { key: 'iris-crm', label: 'Iris CRM', desc: 'Admissions CRM' },
      { key: 'iris-enroll', label: 'Iris Enroll', desc: 'Application & Admissions Management' },
      { key: 'iris-engage', label: 'Iris Engage', desc: 'Student Engagement Platform' },
    ],
  },
  {
    key: 'atlas',
    label: 'Atlas',
    tone: 'warn',
    products: [
      { key: 'atlas-erp', label: 'Atlas ERP', desc: 'Enterprise Resource Planning' },
      { key: 'atlas-hrms', label: 'Atlas HRMS', desc: 'Human Resource Management System' },
      { key: 'atlas-finance', label: 'Atlas Finance', desc: 'Finance & Accounting' },
      { key: 'atlas-placements', label: 'Atlas Placements', desc: 'Placement Management' },
      { key: 'atlas-college', label: 'Atlas College', desc: 'College Administration' },
      { key: 'atlas-presidential', label: 'Atlas Presidential', desc: 'Executive Leadership Dashboard' },
      { key: 'atlas-alumni', label: 'Atlas Alumni', desc: 'Alumni Management' },
      { key: 'atlas-assets', label: 'Atlas Assets', desc: 'Asset Management' },
    ],
  },
];

const BY_KEY = new Map(PRODUCT_CATEGORIES.flatMap((c) => c.products.map((p) => [p.key, { ...p, category: c }])));

export function productLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  return BY_KEY.get(key)?.label ?? key;
}

export function productCategory(key: string | null | undefined): ProductCategory | null {
  if (!key) return null;
  return BY_KEY.get(key)?.category ?? null;
}
