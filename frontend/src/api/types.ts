export type Role = 'ADMIN' | 'HR_MANAGER' | 'MANAGER' | 'EMPLOYEE' | 'INTERN';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: Role;
  is_admin: boolean;
  is_hr?: boolean;
  is_manager: boolean;
  is_employee: boolean;
  is_intern?: boolean;
  is_active: boolean;
  profile?: EmployeeProfile;
}

export interface Department {
  id: number;
  name: string;
  description: string;
  employee_count?: number;
}

export interface EmployeeProfile {
  id: number;
  employee_code: string;
  department: number | null;
  department_name?: string;
  manager: number | null;
  manager_name?: string;
  manager_email?: string;
  designation: string;
  joining_date: string | null;
  phone_number: string;
  address: string;
  emergency_contact: string;
}

export interface LeaveType {
  id: number;
  name: string;
  code: string;
  description: string;
  annual_allowance: string;
  requires_approval: boolean;
  is_paid: boolean;
  is_active: boolean;
}

export interface LeaveBalance {
  id: number;
  employee: number;
  employee_name: string;
  leave_type: number;
  leave_type_name: string;
  leave_type_code: string;
  year: number;
  allocated_days: string;
  carried_forward_days: string;
  total_allocated_days: string;
  used_days: string;
  remaining_days: string;
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ApprovalHistoryItem {
  id: number;
  approver: number;
  approver_name: string;
  action: 'APPROVED' | 'REJECTED';
  comment: string;
  timestamp: string;
}

export interface LeaveRequest {
  id: number;
  employee: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    role: Role;
  };
  department_name?: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  duration_days: string;
  reason: string;
  status: LeaveStatus;
  is_half_day: boolean;
  submitted_at: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  approval_history?: ApprovalHistoryItem[];
}

export interface CalendarEvent {
  id: number;
  employee_id: number;
  employee_name: string;
  department_name?: string;
  leave_type: string;
  leave_type_code: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  status: LeaveStatus;
  is_half_day: boolean;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
  description: string;
}

export interface ReportSummary {
  year: number;
  summary: {
    total_requests: number;
    total_pending: number;
    total_approved: number;
    total_rejected: number;
    total_cancelled: number;
    total_approved_days: number;
  };
  by_leave_type: Array<{
    name: string;
    code: string;
    total_days: number;
    request_count: number;
  }>;
  by_department: Array<{
    department: string;
    total_days: number;
    request_count: number;
  }>;
}

export interface HRDepartmentDistribution {
  id: number;
  name: string;
  count: number;
  percentage: number;
  color: string;
  description: string;
}

export interface HRAttendanceTrend {
  year: number;
  month: number;
  month_name: string;
  full_name: string;
  label: string;
  attendance_rate: number;
  present_count: number;
  leave_count: number;
  absent_count: number;
  total_logged: number;
  avg_work_hours: number;
}

export interface RatingDistributionItem {
  tier: string;
  count: number;
  percentage: number;
  color: string;
}

export interface DepartmentPerformanceItem {
  department: string;
  avg_score: number;
  attendance_rate: number;
  kpi_rate: number;
  badge: string;
}

export interface HRPerformanceData {
  overall_score: number;
  kpi_completion_rate: number;
  punctuality_rate: number;
  active_sprints_delivery: number;
  rating_distribution: RatingDistributionItem[];
  department_performance: DepartmentPerformanceItem[];
}

export interface HRDashboardAnalytics {
  today: {
    date: string;
    present_count: number;
    on_leave_count: number;
    active_checkins: number;
    attendance_rate: number;
  };
  kpis: {
    total_employees: number;
    departments_count: number;
    avg_attendance_rate: number;
    pending_leave_approvals: number;
    leave_utilization_rate: number;
    avg_daily_work_hours: number;
    headcount_growth_rate: string;
    retention_rate: string;
  };
  department_distribution: HRDepartmentDistribution[];
  attendance_trends: HRAttendanceTrend[];
  performance: HRPerformanceData;
}

export type AttendanceStatus =
  | 'PRESENT'
  | 'HALF_DAY'
  | 'ON_LEAVE'
  | 'ABSENT'
  | 'UNPAID_LEAVE'
  | 'HOLIDAY'
  | 'WEEKEND';

export interface AttendanceRecord {
  id: number;
  employee: number;
  employee_name: string;
  employee_email: string;
  employee_code?: string;
  department_name?: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  status_display: string;
  work_duration_hours: string;
  ip_address?: string;
  notes?: string;
  is_checked_in: boolean;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TodayAttendanceStatus {
  date: string;
  status_label: string;
  can_check_in: boolean;
  can_check_out: boolean;
  is_holiday: boolean;
  holiday_name: string | null;
  is_weekend: boolean;
  is_on_leave: boolean;
  leave_name: string | null;
  is_half_day_leave: boolean;
  record: AttendanceRecord | null;
  elapsed_seconds: number;
}

export interface AttendanceSummary {
  period_start: string;
  period_end: string;
  total_records: number;
  present_days: number;
  half_days: number;
  on_leave_days: number;
  absent_days: number;
  holiday_days: number;
  weekend_days: number;
  total_work_hours: string;
  avg_work_hours_per_present_day: string;
}

// -------------------------------------------------------------
// Document Management
// -------------------------------------------------------------
export type DocumentCategory =
  | 'ID_PROOF'
  | 'CONTRACT'
  | 'CERTIFICATE'
  | 'TAX_DOCUMENT'
  | 'PAYSLIP'
  | 'OTHER';

export interface EmployeeDocument {
  id: number;
  employee: number;
  employee_name: string;
  employee_email: string;
  employee_code?: string;
  title: string;
  category: DocumentCategory;
  category_display?: string;
  document_file: string;
  file_url: string;
  file_name?: string;
  file_size_bytes?: number;
  file_type?: string;
  notes?: string;
  expiry_date?: string | null;
  uploaded_by: number;
  uploaded_by_name: string;
  created_at: string;
  updated_at: string;
}

// -------------------------------------------------------------
// Reimbursement Claims
// -------------------------------------------------------------
export type ReimbursementCategory =
  | 'TRAVEL'
  | 'MEALS'
  | 'EQUIPMENT'
  | 'OFFICE_SUPPLIES'
  | 'TRAINING'
  | 'HEALTH_WELLNESS'
  | 'CLIENT_ENTERTAINMENT'
  | 'OTHER';

export type ReimbursementStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface ReimbursementClaim {
  id: number;
  claim_number: string;
  employee: number;
  employee_name: string;
  employee_email: string;
  employee_code?: string;
  department_name?: string;
  title: string;
  category: ReimbursementCategory;
  category_display?: string;
  amount: string;
  currency: string;
  expense_date: string;
  description: string;
  merchant_name?: string;
  receipt_file?: string;
  receipt_url?: string;
  status: ReimbursementStatus;
  status_display?: string;
  reviewed_by?: number | null;
  reviewed_by_name?: string;
  reviewed_at?: string | null;
  rejection_reason?: string;
  payment_reference?: string;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

// -------------------------------------------------------------
// Payroll, Tax & Payslip Management
// -------------------------------------------------------------
export type ComponentType = 'EARNING' | 'DEDUCTION';
export type CalculationType = 'FIXED' | 'PERCENTAGE';
export type PayFrequency = 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY' | 'ANNUAL';
export type TaxRegime = 'NEW_REGIME' | 'OLD_REGIME';
export type PayslipStatus = 'DRAFT' | 'PUBLISHED' | 'PAID';
export type PayslipTheme = 'MODERN_CLEAN' | 'CORPORATE_CLASSIC' | 'COMPACT_MINIMAL';

export interface SalaryComponent {
  id?: number;
  salary_structure?: number;
  name: string;
  component_type: ComponentType;
  calculation_type: CalculationType;
  amount: string | number;
  is_taxable: boolean;
}

export interface SalaryStructure {
  id: number;
  employee: number;
  employee_name?: string;
  employee_email?: string;
  employee_code?: string;
  department_name?: string;
  currency: string;
  base_salary: string | number;
  pay_frequency: PayFrequency;
  is_active: boolean;
  effective_date: string;
  components: SalaryComponent[];
  total_earnings?: string | number;
  total_deductions?: string | number;
  estimated_net_salary?: string | number;
  created_at?: string;
  updated_at?: string;
}

export interface TaxDeduction {
  id: number;
  employee: number;
  employee_name?: string;
  employee_email?: string;
  employee_code?: string;
  tax_year: number;
  tax_regime: TaxRegime;
  pan_or_tax_id?: string;
  tds_monthly_deduction: string | number;
  declared_investments_80c: string | number;
  declared_medical_80d: string | number;
  declared_other_deductions: string | number;
  total_declared_exemptions?: string | number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PayslipTemplate {
  id: number;
  name: string;
  theme_code: PayslipTheme;
  company_name: string;
  company_address: string;
  company_logo?: string | null;
  logo_url?: string | null;
  is_default: boolean;
  accent_color: string;
  footer_notes?: string;
  show_attendance_metrics: boolean;
  show_bank_details: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PayslipBreakdownItem {
  name: string;
  amount: number;
}

export interface Payslip {
  id: number;
  payslip_number: string;
  employee: number;
  employee_name: string;
  employee_email: string;
  employee_code?: string;
  department_name?: string;
  designation?: string;
  pan_or_tax_id?: string;
  bank_name?: string;
  bank_account_number?: string;
  template?: number | null;
  template_details?: PayslipTemplate | null;
  month: number;
  year: number;
  payment_date: string;
  currency: string;
  basic_salary: string | number;
  total_earnings: string | number;
  total_deductions: string | number;
  net_salary: string | number;
  working_days: number;
  paid_days: string | number;
  status: PayslipStatus;
  earnings_breakdown: PayslipBreakdownItem[];
  deductions_breakdown: PayslipBreakdownItem[];
  remarks?: string;
  generated_by_name?: string;
  created_at: string;
  updated_at: string;
}

