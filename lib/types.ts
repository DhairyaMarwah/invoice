export type ClientStatus =
  | 'active'
  | 'prospective'
  | 'inactive'
  | 'not_engaged'
  | 'past';

/** Sales-pipeline position — the "Status of Client" funnel. */
export type SalesStage =
  | 'untouched'
  | 'communication_started'
  | 'active_communication'
  | 'physical_meetings'
  | 'sales_cycle'
  | 'active_customer'
  | 'past_customer'
  | 'dropped';

export type ClientCategory = 'government' | 'private';
export type ClientSegment = 'university' | 'college' | 'edtech' | 'k12';
export type ContactRole = 'poc' | 'promoter' | 'accounts' | 'other';
export type ActivityKind =
  | 'note' | 'call' | 'email' | 'meeting' | 'proposal' | 'file' | 'stage' | 'contract' | 'invoice' | 'payment';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalKind = 'proposal' | 'discount' | 'contract' | 'invoice' | 'expense' | 'other';

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
  sales_stage: SalesStage;
  email: string | null;
  phone: string | null;
  address: string | null;
  gst_number: string | null;
  currency: string;
  notes: string | null;
  // Institution profile
  category: ClientCategory | null;
  segment: ClientSegment | null;
  website: string | null;
  total_campuses: number | null;
  locations: string | null;
  student_strength: number | null;
  faculty_strength: number | null;
  nirf: number; // 0/1
  nirf_category: string | null;
  nirf_rank: number | null;
  qs_ranking: number; // 0/1
  qs_details: string | null;
  // Sales
  source: string | null;
  projected_value: number | null;
  expected_close: string | null;
  engagement_started: string | null;
  issues: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: number;
  client_id: number;
  role: ContactRole;
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  sort: number;
  created_at: string;
}

export interface Activity {
  id: number;
  client_id: number;
  kind: ActivityKind;
  title: string | null;
  body: string | null;
  occurred_at: string;
  file: string | null;
  file_name: string | null;
  meta: string | null;
  created_at: string;
}

export interface Approval {
  id: number;
  title: string;
  detail: string | null;
  kind: ApprovalKind;
  client_id: number | null;
  contract_id: number | null;
  invoice_id: number | null;
  amount: number | null;
  currency: string | null;
  status: ApprovalStatus;
  requested_by: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
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
