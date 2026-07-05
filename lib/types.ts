export type ClientStatus =
  | 'active'
  | 'prospective'
  | 'inactive'
  | 'not_engaged'
  | 'past';

export type BillingCycle = 'annual' | 'monthly' | 'weekly' | 'one_time';
export type ContractStatus = 'active' | 'draft' | 'expired' | 'terminated';
export type InvoiceStatus = 'unpaid' | 'paid';
export type PaymentMethod =
  | 'bank_transfer'
  | 'upi'
  | 'card'
  | 'cheque'
  | 'cash'
  | 'other';

export interface Client {
  id: number;
  name: string;
  status: ClientStatus;
  email: string | null;
  phone: string | null;
  address: string | null;
  gst_number: string | null;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: number;
  client_id: number;
  title: string;
  party: string | null;
  pdf_file: string | null;
  pdf_name: string | null;
  start_date: string | null;
  end_date: string | null;
  billing_cycle: BillingCycle;
  amount: number;
  currency: string;
  tax_rate: number;
  status: ContractStatus;
  product: string | null;
  terms: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractItem {
  id: number;
  contract_id: number;
  label: string;
  value: string | null;
  sort: number;
}

export interface Invoice {
  id: number;
  contract_id: number;
  client_id: number;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  period_start: string | null;
  period_end: string | null;
  bill_to_name: string | null;
  client_address: string | null;
  gst_number: string | null;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  status: InvoiceStatus;
  template: string;
  template_mode: string;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  payment_account: string | null;
  transaction_ref: string | null;
  payment_proof: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  description: string;
  qty: number;
  unit_price: number;
  amount: number;
  sort: number;
}

export interface Account {
  label: string;
  details: string;
}

export interface Settings {
  org_name: string;
  org_tagline: string;
  org_address: string;
  org_gstin: string;
  org_email: string;
  org_phone: string;
  org_logo: string;
  default_currency: string;
  default_tax_rate: string;
  invoice_prefix: string;
  invoice_next_seq: string;
  invoice_due_days: string;
  accounts: string; // JSON Account[]
}
