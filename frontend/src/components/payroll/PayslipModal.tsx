import React, { useRef } from 'react';
import type { Payslip, PayslipTheme } from '../../api/types';
import {
  X,
  Printer,
  Building2,
  CheckCircle2,
} from 'lucide-react';

interface PayslipModalProps {
  payslip: Payslip | null;
  isOpen: boolean;
  onClose: () => void;
  overrideTheme?: PayslipTheme;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  payslip,
  isOpen,
  onClose,
  overrideTheme,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !payslip) return null;

  const template = payslip.template_details;
  const activeTheme: PayslipTheme =
    overrideTheme || template?.theme_code || 'MODERN_CLEAN';

  const companyName = template?.company_name || 'Enterprise Management Systems Inc.';
  const companyAddress =
    template?.company_address || 'Global Headquarters, Innovation Park, Tech Corridor';

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const payPeriodLabel = `${monthNames[payslip.month - 1]} ${payslip.year}`;

  const formatCurrency = (val: string | number) => {
    const num = Number(val) || 0;
    return `${payslip.currency} ${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:fixed print:inset-0">
      {/* Top Floating Action Bar (Hidden on print) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 print:hidden bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-slate-200">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-indigo-500"
        >
          <Printer className="w-4 h-4" />
          Print / Save PDF
        </button>
        <button
          onClick={onClose}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          title="Close Payslip"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Payslip Document Container */}
      <div
        ref={printRef}
        id="printable-payslip"
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 print:m-0 print:border-none print:shadow-none print:max-w-none print:w-full print:rounded-none"
      >
        {/* ============================================================== */}
        {/* THEME 1: MODERN CLEAN */}
        {/* ============================================================== */}
        {activeTheme === 'MODERN_CLEAN' && (
          <div className="p-8 sm:p-12 space-y-8 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-100 pb-8">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 mb-2">
                  <Building2 className="w-3.5 h-3.5" />
                  Official Salary Certificate
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  {companyName}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md">{companyAddress}</p>
              </div>

              <div className="sm:text-right space-y-1">
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                  PAYSLIP REFERENCE
                </span>
                <p className="text-base font-mono font-bold text-slate-800">
                  {payslip.payslip_number}
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {payslip.status}
                </div>
              </div>
            </div>

            {/* Pay Period & Employee Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-50/80 rounded-xl border border-slate-100 text-xs">
              <div>
                <p className="text-slate-400 uppercase font-semibold">Employee Name</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{payslip.employee_name}</p>
                <p className="text-slate-500 font-mono">{payslip.employee_code || 'EMP-DIR'}</p>
              </div>

              <div>
                <p className="text-slate-400 uppercase font-semibold">Designation & Team</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {payslip.designation || 'Staff Associate'}
                </p>
                <p className="text-slate-500">{payslip.department_name || 'Operations'}</p>
              </div>

              <div>
                <p className="text-slate-400 uppercase font-semibold">Pay Period</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{payPeriodLabel}</p>
                <p className="text-slate-500">Paid on: {payslip.payment_date}</p>
              </div>

              <div>
                <p className="text-slate-400 uppercase font-semibold">Tax & Bank Account</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5 font-mono">
                  {payslip.bank_account_number || '•••• 5829'}
                </p>
                <p className="text-slate-500 font-mono">
                  PAN: {payslip.pan_or_tax_id || 'NOT_DECLARED'}
                </p>
              </div>
            </div>

            {/* Attendance & Working Days Metrics */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-3 px-5 bg-blue-50/40 rounded-xl border border-blue-100 text-xs text-blue-900">
              <span className="font-semibold">Working Days in Month: {payslip.working_days} Days</span>
              <span className="font-semibold text-emerald-700">
                Paid / Attended Days: {payslip.paid_days} Days
              </span>
              <span className="text-slate-500">Currency: {payslip.currency}</span>
            </div>

            {/* Financial Ledger (Earnings vs Deductions) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Earnings Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b-2 border-blue-600">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                    Earnings
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">Amount</span>
                </div>
                <div className="space-y-2.5 text-xs">
                  {payslip.earnings_breakdown && payslip.earnings_breakdown.length > 0 ? (
                    payslip.earnings_breakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1 border-b border-dashed border-slate-100">
                        <span className="text-slate-700 font-medium">{item.name}</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(item.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-700">Basic Salary</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(payslip.basic_salary)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-sm font-bold text-slate-900 bg-slate-50 p-2.5 rounded-lg">
                  <span>Gross Earnings</span>
                  <span className="text-blue-600">{formatCurrency(payslip.total_earnings)}</span>
                </div>
              </div>

              {/* Deductions Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b-2 border-rose-500">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                    Deductions & Taxes
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">Amount</span>
                </div>
                <div className="space-y-2.5 text-xs">
                  {payslip.deductions_breakdown && payslip.deductions_breakdown.length > 0 ? (
                    payslip.deductions_breakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1 border-b border-dashed border-slate-100">
                        <span className="text-slate-700 font-medium">{item.name}</span>
                        <span className="font-semibold text-rose-600">-{formatCurrency(item.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic py-2">No deductions recorded.</div>
                  )}
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-sm font-bold text-slate-900 bg-slate-50 p-2.5 rounded-lg">
                  <span>Total Deductions</span>
                  <span className="text-rose-600">-{formatCurrency(payslip.total_deductions)}</span>
                </div>
              </div>
            </div>

            {/* Net Pay Callout */}
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-blue-500/10">
              <div className="space-y-0.5">
                <p className="text-xs uppercase tracking-wider text-blue-100 font-semibold">
                  Net Salary Transferred
                </p>
                <p className="text-xs text-blue-200">Deposited into designated primary salary bank account</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold tracking-tight">
                  {formatCurrency(payslip.net_salary)}
                </p>
              </div>
            </div>

            {/* Remarks & Footer Notes */}
            <div className="pt-6 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-700">Remarks / Notes:</p>
                <p>{payslip.remarks || template?.footer_notes || 'This is a computer-generated payslip and does not require a physical signature.'}</p>
              </div>
              <div className="sm:text-right">
                <p className="font-semibold text-slate-700">Verified By:</p>
                <p>{payslip.generated_by_name || 'System Payroll Administrator'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* THEME 2: CORPORATE CLASSIC */}
        {/* ============================================================== */}
        {activeTheme === 'CORPORATE_CLASSIC' && (
          <div className="p-8 sm:p-12 space-y-6 font-serif text-slate-800">
            {/* Header */}
            <div className="text-center border-b-2 border-slate-800 pb-6 space-y-1">
              <h1 className="text-2xl font-bold tracking-wide uppercase text-slate-900">
                {companyName}
              </h1>
              <p className="text-xs text-slate-600 font-sans">{companyAddress}</p>
              <h2 className="text-sm font-semibold tracking-widest uppercase text-slate-700 mt-2 font-sans">
                SALARY SLIP FOR THE MONTH OF {payPeriodLabel.toUpperCase()}
              </h2>
            </div>

            {/* Two-column Classic Metadata Table */}
            <table className="w-full text-xs font-sans border border-slate-300 border-collapse">
              <tbody>
                <tr className="border-b border-slate-300">
                  <td className="p-2.5 font-bold bg-slate-100 w-1/4 border-r border-slate-300">Employee Name</td>
                  <td className="p-2.5 w-1/4 border-r border-slate-300">{payslip.employee_name}</td>
                  <td className="p-2.5 font-bold bg-slate-100 w-1/4 border-r border-slate-300">Employee ID</td>
                  <td className="p-2.5 w-1/4">{payslip.employee_code || 'EMP-DIR'}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-2.5 font-bold bg-slate-100 border-r border-slate-300">Department</td>
                  <td className="p-2.5 border-r border-slate-300">{payslip.department_name || 'General'}</td>
                  <td className="p-2.5 font-bold bg-slate-100 border-r border-slate-300">Designation</td>
                  <td className="p-2.5">{payslip.designation || 'Staff'}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-2.5 font-bold bg-slate-100 border-r border-slate-300">Bank Account</td>
                  <td className="p-2.5 border-r border-slate-300 font-mono">{payslip.bank_account_number || '••••'}</td>
                  <td className="p-2.5 font-bold bg-slate-100 border-r border-slate-300">PAN / Tax ID</td>
                  <td className="p-2.5 font-mono">{payslip.pan_or_tax_id || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold bg-slate-100 border-r border-slate-300">Total Working Days</td>
                  <td className="p-2.5 border-r border-slate-300">{payslip.working_days} Days</td>
                  <td className="p-2.5 font-bold bg-slate-100 border-r border-slate-300">Paid Days</td>
                  <td className="p-2.5">{payslip.paid_days} Days</td>
                </tr>
              </tbody>
            </table>

            {/* Classic Ledger Grid */}
            <div className="grid grid-cols-2 border border-slate-300 font-sans text-xs">
              {/* Earnings column */}
              <div className="border-r border-slate-300">
                <div className="bg-slate-100 font-bold p-2 text-slate-800 flex justify-between border-b border-slate-300">
                  <span>EARNINGS</span>
                  <span>AMOUNT ({payslip.currency})</span>
                </div>
                <div className="p-2 space-y-1.5 min-h-[140px]">
                  {payslip.earnings_breakdown && payslip.earnings_breakdown.length > 0 ? (
                    payslip.earnings_breakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.name}</span>
                        <span>{Number(item.amount).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between">
                      <span>Basic Salary</span>
                      <span>{Number(payslip.basic_salary).toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="bg-slate-100 font-bold p-2 text-slate-900 flex justify-between border-t border-slate-300">
                  <span>Gross Earnings</span>
                  <span>{formatCurrency(payslip.total_earnings)}</span>
                </div>
              </div>

              {/* Deductions column */}
              <div>
                <div className="bg-slate-100 font-bold p-2 text-slate-800 flex justify-between border-b border-slate-300">
                  <span>DEDUCTIONS</span>
                  <span>AMOUNT ({payslip.currency})</span>
                </div>
                <div className="p-2 space-y-1.5 min-h-[140px]">
                  {payslip.deductions_breakdown && payslip.deductions_breakdown.length > 0 ? (
                    payslip.deductions_breakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.name}</span>
                        <span>{Number(item.amount).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 italic">None</div>
                  )}
                </div>
                <div className="bg-slate-100 font-bold p-2 text-slate-900 flex justify-between border-t border-slate-300">
                  <span>Total Deductions</span>
                  <span>{formatCurrency(payslip.total_deductions)}</span>
                </div>
              </div>
            </div>

            {/* Net Salary Box */}
            <div className="border-2 border-slate-800 p-4 font-sans flex justify-between items-center bg-slate-50">
              <span className="font-bold text-sm tracking-wide uppercase">
                NET PAYABLE SALARY:
              </span>
              <span className="font-bold text-xl font-mono text-slate-900">
                {formatCurrency(payslip.net_salary)}
              </span>
            </div>

            {/* Signatures */}
            <div className="pt-12 grid grid-cols-2 font-sans text-xs text-center">
              <div>
                <div className="w-48 mx-auto border-t border-slate-400 pt-1">Employee Signature</div>
              </div>
              <div>
                <div className="w-48 mx-auto border-t border-slate-400 pt-1">Authorized Signatory</div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* THEME 3: COMPACT MINIMAL */}
        {/* ============================================================== */}
        {activeTheme === 'COMPACT_MINIMAL' && (
          <div className="p-6 sm:p-8 space-y-4 font-mono text-xs text-slate-900">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h1 className="font-bold text-base tracking-tight">{companyName}</h1>
                <p className="text-[11px] text-slate-500 font-sans">{payPeriodLabel} | SLIP #{payslip.payslip_number}</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-emerald-700">{formatCurrency(payslip.net_salary)}</span>
                <p className="text-[10px] text-slate-400">NET TRANSFERRED</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[9px]">EMPLOYEE</span>
                <span className="font-bold">{payslip.employee_name}</span> ({payslip.employee_code || 'EMP'})
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">ROLE / DEPT</span>
                <span>{payslip.designation || 'Staff'} / {payslip.department_name || 'Ops'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">PAID DAYS</span>
                <span>{payslip.paid_days} / {payslip.working_days} Days</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded p-2.5 space-y-1">
                <div className="font-bold border-b pb-1 text-[11px]">EARNINGS</div>
                {payslip.earnings_breakdown?.map((e, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span>{e.name}</span>
                    <span>{e.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t pt-1 text-[11px]">
                  <span>Total</span>
                  <span>{Number(payslip.total_earnings).toFixed(2)}</span>
                </div>
              </div>

              <div className="border rounded p-2.5 space-y-1">
                <div className="font-bold border-b pb-1 text-[11px]">DEDUCTIONS</div>
                {payslip.deductions_breakdown?.map((d, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span>{d.name}</span>
                    <span>{d.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t pt-1 text-[11px]">
                  <span>Total</span>
                  <span>{Number(payslip.total_deductions).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 text-center pt-2">
              Generated by EMS automated payroll. Bank: {payslip.bank_account_number || '••••'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
