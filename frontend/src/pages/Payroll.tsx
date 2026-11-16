import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type {
  SalaryStructure,
  SalaryComponent,
  TaxDeduction,
  Payslip,
  PayslipTemplate,
  PayslipTheme,
  User,
} from '../api/types';
import { PayslipModal } from '../components/payroll/PayslipModal';
import {
  DollarSign,
  FileText,
  Calculator,
  Palette,
  Play,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  CreditCard,
  AlertCircle,
  X,
} from 'lucide-react';

export const Payroll: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || Boolean(user?.is_admin);
  const isHR = isAdmin || user?.role === 'HR_MANAGER' || Boolean(user?.is_hr);

  // Tabs
  const [activeTab, setActiveTab] = useState<'salaries' | 'taxes' | 'payslips' | 'templates'>(
    isHR ? 'payslips' : 'payslips'
  );

  // Data states
  const [salaries, setSalaries] = useState<SalaryStructure[]>([]);
  const [taxes, setTaxes] = useState<TaxDeduction[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [templates, setTemplates] = useState<PayslipTemplate[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected Payslip for printing/modal
  const [viewingPayslip, setViewingPayslip] = useState<Payslip | null>(null);
  const [previewTheme, setPreviewTheme] = useState<PayslipTheme | undefined>(undefined);

  // Batch Payroll Generation Modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchMonth, setBatchMonth] = useState(new Date().getMonth() + 1);
  const [batchYear, setBatchYear] = useState(new Date().getFullYear());
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchTemplateId, setBatchTemplateId] = useState<number | ''>('');
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchMessage, setBatchMessage] = useState('');

  // Salary Structure Modal
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [editingSalaryId, setEditingSalaryId] = useState<number | null>(null);
  const [salaryEmpId, setSalaryEmpId] = useState<string>('');
  const [baseSalary, setBaseSalary] = useState<string>('50000');
  const [salaryCurrency, setSalaryCurrency] = useState<string>('INR');
  const [payFreq, setPayFreq] = useState<'MONTHLY' | 'BIWEEKLY' | 'WEEKLY' | 'ANNUAL'>('MONTHLY');
  const [salaryComponents, setSalaryComponents] = useState<SalaryComponent[]>([
    { name: 'House Rent Allowance (HRA)', component_type: 'EARNING', calculation_type: 'PERCENTAGE', amount: 40, is_taxable: true },
    { name: 'Special Allowance', component_type: 'EARNING', calculation_type: 'FIXED', amount: 5000, is_taxable: true },
    { name: 'Provident Fund (PF)', component_type: 'DEDUCTION', calculation_type: 'PERCENTAGE', amount: 12, is_taxable: false },
  ]);
  const [salarySaving, setSalarySaving] = useState(false);
  const [salaryError, setSalaryError] = useState('');

  // Tax Profile Modal
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [taxEmpId, setTaxEmpId] = useState<string>('');
  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear());
  const [taxRegime, setTaxRegime] = useState<'NEW_REGIME' | 'OLD_REGIME'>('NEW_REGIME');
  const [panId, setPanId] = useState('');
  const [tdsMonthly, setTdsMonthly] = useState('');
  const [inv80c, setInv80c] = useState('');
  const [med80d, setMed80d] = useState('');
  const [otherDeductions, setOtherDeductions] = useState('');
  const [taxSaving, setTaxSaving] = useState(false);
  const [taxError, setTaxError] = useState('');

  // Template Edit Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PayslipTemplate | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplTheme, setTplTheme] = useState<PayslipTheme>('MODERN_CLEAN');
  const [tplCompany, setTplCompany] = useState('');
  const [tplAddress, setTplAddress] = useState('');
  const [tplColor, setTplColor] = useState('#2563EB');
  const [tplFooter, setTplFooter] = useState('');
  const [tplDefault, setTplDefault] = useState(false);
  const [tplSaving, setTplSaving] = useState(false);

  // Fetch all payroll data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [salRes, taxRes, payRes, tplRes] = await Promise.all([
        apiClient.get('/payroll/salaries/'),
        apiClient.get('/payroll/tax-deductions/'),
        apiClient.get('/payroll/payslips/'),
        apiClient.get('/payroll/templates/'),
      ]);

      setSalaries(salRes.data.results || salRes.data || []);
      setTaxes(taxRes.data.results || taxRes.data || []);
      setPayslips(payRes.data.results || payRes.data || []);
      setTemplates(tplRes.data.results || tplRes.data || []);

      if (isHR) {
        const empRes = await apiClient.get('/users/');
        setEmployees(empRes.data.results || empRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load payroll records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Batch payroll generation
  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchProcessing(true);
    setBatchMessage('');
    try {
      const res = await apiClient.post('/payroll/payslips/generate_batch/', {
        month: batchMonth,
        year: batchYear,
        payment_date: batchDate,
        template_id: batchTemplateId || undefined,
      });
      setBatchMessage(res.data.message || 'Batch processed successfully!');
      fetchData();
      setTimeout(() => {
        setIsBatchModalOpen(false);
        setBatchMessage('');
      }, 1500);
    } catch (err: any) {
      setBatchMessage(err.response?.data?.detail || 'Failed to batch-generate payslips.');
    } finally {
      setBatchProcessing(false);
    }
  };

  // Save Salary Structure
  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalaryError('');
    if (!salaryEmpId && !editingSalaryId) {
      setSalaryError('Please select an employee.');
      return;
    }
    setSalarySaving(true);
    try {
      const payload = {
        employee: Number(salaryEmpId),
        base_salary: baseSalary,
        currency: salaryCurrency,
        pay_frequency: payFreq,
        is_active: true,
        effective_date: new Date().toISOString().split('T')[0],
        components: salaryComponents,
      };

      if (editingSalaryId) {
        await apiClient.put(`/payroll/salaries/${editingSalaryId}/`, payload);
      } else {
        await apiClient.post('/payroll/salaries/', payload);
      }

      setIsSalaryModalOpen(false);
      setEditingSalaryId(null);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data || 'Failed to save salary structure.';
      setSalaryError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSalarySaving(false);
    }
  };

  // Save Tax Profile
  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaxError('');
    if (!taxEmpId) {
      setTaxError('Please select an employee.');
      return;
    }
    setTaxSaving(true);
    try {
      const payload = {
        employee: Number(taxEmpId),
        tax_year: taxYear,
        tax_regime: taxRegime,
        pan_or_tax_id: panId,
        tds_monthly_deduction: tdsMonthly || '0.00',
        declared_investments_80c: inv80c || '0.00',
        declared_medical_80d: med80d || '0.00',
        declared_other_deductions: otherDeductions || '0.00',
      };

      await apiClient.post('/payroll/tax-deductions/', payload);
      setIsTaxModalOpen(false);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data || 'Failed to save tax profile.';
      setTaxError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setTaxSaving(false);
    }
  };

  // Save Template
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setTplSaving(true);
    try {
      const payload = {
        name: tplName,
        theme_code: tplTheme,
        company_name: tplCompany,
        company_address: tplAddress,
        accent_color: tplColor,
        footer_notes: tplFooter,
        is_default: tplDefault,
        show_attendance_metrics: true,
        show_bank_details: true,
      };

      if (editingTemplate) {
        await apiClient.put(`/payroll/templates/${editingTemplate.id}/`, payload);
      } else {
        await apiClient.post('/payroll/templates/', payload);
      }

      setIsTemplateModalOpen(false);
      setEditingTemplate(null);
      fetchData();
    } catch (err) {
      console.error('Failed to save template', err);
    } finally {
      setTplSaving(false);
    }
  };

  // Add component row
  const addComponentRow = () => {
    setSalaryComponents([
      ...salaryComponents,
      { name: 'Custom Allowance', component_type: 'EARNING', calculation_type: 'FIXED', amount: 1000, is_taxable: true },
    ]);
  };

  const removeComponentRow = (index: number) => {
    setSalaryComponents(salaryComponents.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-indigo-600" />
            Payroll, Compensation & Tax Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage salary structures, tax regimes, batch payroll disbursement, and custom branded payslips.
          </p>
        </div>

        {isHR && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setBatchMessage('');
                setIsBatchModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-sm shadow-emerald-600/20 transition-all focus:ring-2 focus:ring-emerald-500"
            >
              <Play className="w-4 h-4 fill-white" />
              Batch Process Payroll
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('payslips')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'payslips'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          {isHR ? 'All Employee Payslips' : 'My Payslips & Slips'} ({payslips.length})
        </button>

        {isHR && (
          <>
            <button
              onClick={() => setActiveTab('salaries')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                activeTab === 'salaries'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Salary Structures ({salaries.length})
            </button>

            <button
              onClick={() => setActiveTab('taxes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                activeTab === 'taxes'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calculator className="w-4 h-4" />
              Tax Deductions & Regimes ({taxes.length})
            </button>
          </>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'templates'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Palette className="w-4 h-4" />
            Payslip Template Studio ({templates.length})
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: PAYSLIPS */}
      {/* ============================================================== */}
      {activeTab === 'payslips' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Disbursed Payslips</h3>
            <span className="text-xs text-slate-400">Showing {payslips.length} issued payslips</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading payslips...</div>
          ) : payslips.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No payslips issued yet</p>
              <p className="text-xs text-slate-400">
                {isHR
                  ? 'Run batch payroll above to generate payslips for all active employees.'
                  : 'Your monthly payslips will be published here upon disbursement.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3.5">Payslip #</th>
                    <th className="px-5 py-3.5">Employee</th>
                    <th className="px-5 py-3.5">Period</th>
                    <th className="px-5 py-3.5 text-right">Gross Earnings</th>
                    <th className="px-5 py-3.5 text-right">Deductions</th>
                    <th className="px-5 py-3.5 text-right">Net Salary</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {payslips.map((slip) => (
                    <tr key={slip.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-semibold text-slate-800">
                        {slip.payslip_number}
                      </td>

                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800">{slip.employee_name}</p>
                        <p className="text-slate-400 text-[11px]">{slip.designation || 'Staff'}</p>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-medium text-slate-800">
                          {slip.month}/{slip.year}
                        </span>
                        <p className="text-[11px] text-slate-400">Paid: {slip.payment_date}</p>
                      </td>

                      <td className="px-5 py-3.5 text-right font-medium text-slate-700">
                        {slip.currency} {Number(slip.total_earnings).toFixed(2)}
                      </td>

                      <td className="px-5 py-3.5 text-right font-medium text-rose-600">
                        -{slip.currency} {Number(slip.total_deductions).toFixed(2)}
                      </td>

                      <td className="px-5 py-3.5 text-right font-bold text-slate-900 text-sm">
                        {slip.currency} {Number(slip.net_salary).toFixed(2)}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          {slip.status}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setViewingPayslip(slip);
                            setPreviewTheme(undefined);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View / Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: SALARIES & COMPENSATION */}
      {/* ============================================================== */}
      {activeTab === 'salaries' && isHR && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Employee Base Compensation</h3>
              <p className="text-xs text-slate-500">Configure base salaries, allowances, and flexible payroll components.</p>
            </div>
            <button
              onClick={() => {
                setEditingSalaryId(null);
                setSalaryEmpId('');
                setBaseSalary('60000');
                setSalaryError('');
                setIsSalaryModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Configure Salary
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Frequency</th>
                  <th className="px-5 py-3.5 text-right">Base Salary</th>
                  <th className="px-5 py-3.5 text-right">Estimated Net</th>
                  <th className="px-5 py-3.5">Components</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {salaries.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{s.employee_name}</p>
                      <p className="text-slate-400 text-[11px]">{s.employee_email}</p>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600">{s.department_name || 'Staff'}</td>

                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                        {s.pay_frequency}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                      {s.currency} {Number(s.base_salary).toLocaleString()}
                    </td>

                    <td className="px-5 py-3.5 text-right font-bold text-emerald-600 text-sm">
                      {s.currency} {Number(s.estimated_net_salary || s.base_salary).toLocaleString()}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="text-slate-500">{s.components?.length || 0} active components</span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setEditingSalaryId(s.id);
                          setSalaryEmpId(String(s.employee));
                          setBaseSalary(String(s.base_salary));
                          setSalaryCurrency(s.currency);
                          setPayFreq(s.pay_frequency);
                          setSalaryComponents(s.components || []);
                          setSalaryError('');
                          setIsSalaryModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                        title="Edit Structure"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: TAX PROFILES & REGIMES */}
      {/* ============================================================== */}
      {activeTab === 'taxes' && isHR && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Employee Tax Regimes & Deduction Profiles</h3>
              <p className="text-xs text-slate-500">Track PAN/Tax IDs, New vs Old Tax Regimes, and declared Section 80 exemptions.</p>
            </div>
            <button
              onClick={() => {
                setTaxEmpId('');
                setPanId('');
                setTdsMonthly('3500');
                setTaxError('');
                setIsTaxModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Configure Tax Profile
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Tax Year</th>
                  <th className="px-5 py-3.5">Regime</th>
                  <th className="px-5 py-3.5">PAN / Tax ID</th>
                  <th className="px-5 py-3.5 text-right">Monthly TDS</th>
                  <th className="px-5 py-3.5 text-right">Total Exemptions</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {taxes.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{t.employee_name}</p>
                      <p className="text-slate-400 text-[11px]">{t.employee_email}</p>
                    </td>

                    <td className="px-5 py-3.5 font-bold text-slate-800">{t.tax_year}</td>

                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {t.tax_regime.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-slate-700">{t.pan_or_tax_id || 'NOT_DECLARED'}</td>

                    <td className="px-5 py-3.5 text-right font-bold text-rose-600">
                      ₹{Number(t.tds_monthly_deduction).toFixed(2)}
                    </td>

                    <td className="px-5 py-3.5 text-right font-semibold text-emerald-600">
                      ₹{Number(t.total_declared_exemptions || 0).toLocaleString()}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setTaxEmpId(String(t.employee));
                          setTaxYear(t.tax_year);
                          setTaxRegime(t.tax_regime);
                          setPanId(t.pan_or_tax_id || '');
                          setTdsMonthly(String(t.tds_monthly_deduction));
                          setInv80c(String(t.declared_investments_80c));
                          setMed80d(String(t.declared_medical_80d));
                          setOtherDeductions(String(t.declared_other_deductions));
                          setIsTaxModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                        title="Edit Tax Profile"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: TEMPLATE STUDIO (ADMIN ONLY) */}
      {/* ============================================================== */}
      {activeTab === 'templates' && isAdmin && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Payslip Template Studio & Designer</h3>
              <p className="text-xs text-slate-500">Design, customize, and select organizational payslip layouts and branding themes.</p>
            </div>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setTplName('Custom Corporate Theme');
                setTplTheme('MODERN_CLEAN');
                setTplCompany('Acme Global Inc.');
                setTplAddress('100 Technology Plaza, Tech Hub');
                setTplColor('#2563EB');
                setTplFooter('Generated by EMS Automated Payroll');
                setTplDefault(false);
                setIsTemplateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className={`bg-white rounded-2xl border ${
                  tpl.is_default ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200/80'
                } p-6 shadow-xs flex flex-col justify-between space-y-4`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                      {tpl.theme_code}
                    </span>
                    {tpl.is_default && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700">
                        Active Default
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-800 text-base">{tpl.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{tpl.company_name}</p>
                  <p className="text-[11px] text-slate-400">{tpl.company_address}</p>

                  <div className="mt-4 flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border border-slate-200"
                      style={{ backgroundColor: tpl.accent_color }}
                    />
                    <span className="text-xs font-mono text-slate-600">{tpl.accent_color}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (payslips.length > 0) {
                        setViewingPayslip(payslips[0]);
                        setPreviewTheme(tpl.theme_code);
                      } else {
                        alert('Generate a payslip first to live-preview this template.');
                      }
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview Template
                  </button>

                  <button
                    onClick={() => {
                      setEditingTemplate(tpl);
                      setTplName(tpl.name);
                      setTplTheme(tpl.theme_code);
                      setTplCompany(tpl.company_name);
                      setTplAddress(tpl.company_address);
                      setTplColor(tpl.accent_color);
                      setTplFooter(tpl.footer_notes || '');
                      setTplDefault(tpl.is_default);
                      setIsTemplateModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: BATCH RUN PAYROLL */}
      {/* ============================================================== */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-600 fill-emerald-600" />
                Batch Generate Monthly Payroll
              </h3>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {batchMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{batchMessage}</span>
              </div>
            )}

            <form onSubmit={handleGenerateBatch} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Month (1 - 12)</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={batchMonth}
                    onChange={(e) => setBatchMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Year</label>
                  <input
                    type="number"
                    required
                    value={batchYear}
                    onChange={(e) => setBatchYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Payslip Template</label>
                <select
                  value={batchTemplateId}
                  onChange={(e) => setBatchTemplateId(Number(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="">Use Default Active Template</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.theme_code})
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
                This will automatically compute gross allowances, calculate PF, apply monthly TDS quotas from active tax profiles, and generate published payslips for active employees.
              </p>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchProcessing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {batchProcessing ? 'Executing...' : 'Run Payroll Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIGURE SALARY STRUCTURE */}
      {/* ============================================================== */}
      {isSalaryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                {editingSalaryId ? 'Edit Salary Structure' : 'Set Employee Salary Structure'}
              </h3>
              <button
                onClick={() => setIsSalaryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {salaryError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{salaryError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSalary} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employee *</label>
                <select
                  disabled={Boolean(editingSalaryId)}
                  value={salaryEmpId}
                  onChange={(e) => setSalaryEmpId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100"
                >
                  <option value="">Select an employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Base Basic Salary *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Currency</label>
                  <select
                    value={salaryCurrency}
                    onChange={(e) => setSalaryCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Components List */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">Allowance & Deduction Components</label>
                  <button
                    type="button"
                    onClick={addComponentRow}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 text-[11px]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Component
                  </button>
                </div>

                <div className="space-y-2">
                  {salaryComponents.map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        placeholder="Component Name"
                        value={comp.name}
                        onChange={(e) => {
                          const updated = [...salaryComponents];
                          updated[idx].name = e.target.value;
                          setSalaryComponents(updated);
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />

                      <select
                        value={comp.component_type}
                        onChange={(e) => {
                          const updated = [...salaryComponents];
                          updated[idx].component_type = e.target.value as any;
                          setSalaryComponents(updated);
                        }}
                        className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                      >
                        <option value="EARNING">Earning (+)</option>
                        <option value="DEDUCTION">Deduction (-)</option>
                      </select>

                      <select
                        value={comp.calculation_type}
                        onChange={(e) => {
                          const updated = [...salaryComponents];
                          updated[idx].calculation_type = e.target.value as any;
                          setSalaryComponents(updated);
                        }}
                        className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="PERCENTAGE">% of Base</option>
                        <option value="FIXED">Fixed Amt</option>
                      </select>

                      <input
                        type="number"
                        placeholder="Amount"
                        value={comp.amount}
                        onChange={(e) => {
                          const updated = [...salaryComponents];
                          updated[idx].amount = Number(e.target.value);
                          setSalaryComponents(updated);
                        }}
                        className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />

                      <button
                        type="button"
                        onClick={() => removeComponentRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSalaryModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={salarySaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {salarySaving ? 'Saving...' : 'Save Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIGURE TAX PROFILE */}
      {/* ============================================================== */}
      {isTaxModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600" />
                Configure Employee Tax Profile
              </h3>
              <button
                onClick={() => setIsTaxModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {taxError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{taxError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTax} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employee *</label>
                <select
                  value={taxEmpId}
                  onChange={(e) => setTaxEmpId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">Select an employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tax Regime</label>
                  <select
                    value={taxRegime}
                    onChange={(e) => setTaxRegime(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="NEW_REGIME">New Tax Regime</option>
                    <option value="OLD_REGIME">Old Tax Regime</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tax Year</label>
                  <input
                    type="number"
                    value={taxYear}
                    onChange={(e) => setTaxYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PAN / Tax ID</label>
                  <input
                    type="text"
                    placeholder="e.g. ABCDE1234F"
                    value={panId}
                    onChange={(e) => setPanId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly TDS Deduction</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={tdsMonthly}
                    onChange={(e) => setTdsMonthly(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {taxRegime === 'OLD_REGIME' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="font-bold text-slate-800">Declared Exemptions (Old Regime)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 mb-1">Section 80C (PPF/ELSS)</label>
                      <input
                        type="number"
                        placeholder="Up to 150000"
                        value={inv80c}
                        onChange={(e) => setInv80c(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Section 80D (Medical)</label>
                      <input
                        type="number"
                        placeholder="Up to 50000"
                        value={med80d}
                        onChange={(e) => setMed80d(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTaxModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taxSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {taxSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDIT / CREATE TEMPLATE */}
      {/* ============================================================== */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-600" />
                {editingTemplate ? 'Customize Template' : 'Design New Template'}
              </h3>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Template Title *</label>
                <input
                  type="text"
                  required
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Layout & Styling Engine *</label>
                <select
                  value={tplTheme}
                  onChange={(e) => setTplTheme(e.target.value as PayslipTheme)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-semibold"
                >
                  <option value="MODERN_CLEAN">Modern Clean (Executive SaaS Layout)</option>
                  <option value="CORPORATE_CLASSIC">Corporate Classic (Formal Tabular Certificate)</option>
                  <option value="COMPACT_MINIMAL">Compact Minimal (Single-Page Direct Ledger)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Entity Name *</label>
                <input
                  type="text"
                  required
                  value={tplCompany}
                  onChange={(e) => setTplCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Physical Address</label>
                <input
                  type="text"
                  value={tplAddress}
                  onChange={(e) => setTplAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Theme Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={tplColor}
                    onChange={(e) => setTplColor(e.target.value)}
                    className="w-10 h-10 p-0 border border-slate-200 rounded-xl cursor-pointer"
                  />
                  <input
                    type="text"
                    value={tplColor}
                    onChange={(e) => setTplColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Legal Footer Notes</label>
                <textarea
                  rows={2}
                  value={tplFooter}
                  onChange={(e) => setTplFooter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="tplDef"
                  checked={tplDefault}
                  onChange={(e) => setTplDefault(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="tplDef" className="font-semibold text-slate-700">
                  Set as Company Default Template
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tplSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {tplSaving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PAYSLIP PRINT & PREVIEW MODAL */}
      {/* ============================================================== */}
      <PayslipModal
        payslip={viewingPayslip}
        isOpen={Boolean(viewingPayslip)}
        onClose={() => setViewingPayslip(null)}
        overrideTheme={previewTheme}
      />
    </div>
  );
};
