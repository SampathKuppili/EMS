import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type {
  ReimbursementClaim,
  ReimbursementCategory,
  ReimbursementStatus,
} from '../api/types';
import {
  Receipt,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  Search,
  ExternalLink,
  AlertCircle,
  X,
} from 'lucide-react';

const CATEGORIES: { value: ReimbursementCategory; label: string }[] = [
  { value: 'TRAVEL', label: 'Travel & Transport' },
  { value: 'MEALS', label: 'Meals & Subsistence' },
  { value: 'EQUIPMENT', label: 'Hardware & Equipment' },
  { value: 'OFFICE_SUPPLIES', label: 'Office Supplies & Stationery' },
  { value: 'TRAINING', label: 'Courses & Certification' },
  { value: 'HEALTH_WELLNESS', label: 'Health & Wellness' },
  { value: 'CLIENT_ENTERTAINMENT', label: 'Client Entertainment' },
  { value: 'OTHER', label: 'General / Miscellaneous' },
];

export const Reimbursements: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || Boolean(user?.is_admin);
  const isHR = isAdmin || user?.role === 'HR_MANAGER' || Boolean(user?.is_hr);
  const isManager = user?.role === 'MANAGER' || isHR;

  // State
  const [claims, setClaims] = useState<ReimbursementClaim[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'my_claims' | 'team_claims'>(
    isManager ? 'team_claims' : 'my_claims'
  );

  // Modal states
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [selectedClaim, setSelectedClaim] = useState<ReimbursementClaim | null>(null);

  // New Claim Form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ReimbursementCategory>('TRAVEL');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [merchantName, setMerchantName] = useState('');
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Review Modal Form
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | 'MARK_PAID'>('APPROVE');
  const [reviewComments, setReviewComments] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/reimbursements/claims/');
      setClaims(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to load reimbursement claims', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!title || !amount || !expenseDate) {
      setFormError('Please fill in title, amount, and expense date.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('amount', amount);
      formData.append('currency', currency);
      formData.append('expense_date', expenseDate);
      if (merchantName) formData.append('merchant_name', merchantName);
      if (description) formData.append('description', description);
      if (receiptFile) formData.append('receipt_file', receiptFile);

      await apiClient.post('/reimbursements/claims/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setIsNewModalOpen(false);
      setTitle('');
      setAmount('');
      setMerchantName('');
      setDescription('');
      setReceiptFile(null);
      fetchClaims();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to submit reimbursement claim.';
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;
    setReviewError('');

    if (reviewAction === 'REJECT' && !reviewComments.trim()) {
      setReviewError('A reason is mandatory when rejecting a claim.');
      return;
    }

    setReviewing(true);
    try {
      await apiClient.post(`/reimbursements/claims/${selectedClaim.id}/review/`, {
        action: reviewAction,
        comments: reviewComments,
        payment_reference: paymentRef,
      });

      setIsReviewModalOpen(false);
      setSelectedClaim(null);
      setReviewComments('');
      setPaymentRef('');
      fetchClaims();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to review claim.';
      setReviewError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setReviewing(false);
    }
  };

  // Filter claims based on view tab & search
  const visibleClaims = claims.filter((claim) => {
    if (activeTab === 'my_claims' && claim.employee !== user?.id) {
      return false;
    }
    if (selectedStatus !== 'ALL' && claim.status !== selectedStatus) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = claim.title.toLowerCase().includes(q);
      const matchEmp = claim.employee_name.toLowerCase().includes(q);
      const matchNum = claim.claim_number.toLowerCase().includes(q);
      const matchMerch = claim.merchant_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchEmp && !matchNum && !matchMerch) return false;
    }
    return true;
  });

  // Calculate Stat metrics
  const totalAmount = claims.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  const pendingCount = claims.filter((c) => c.status === 'PENDING').length;
  const approvedCount = claims.filter((c) => c.status === 'APPROVED').length;
  const paidCount = claims.filter((c) => c.status === 'PAID').length;

  const getStatusBadge = (status: ReimbursementStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <DollarSign className="w-3 h-3" /> Reimbursed / Paid
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-indigo-600" />
            Reimbursements & Expense Claims
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit expense receipts, track reimbursement progress, and process staff claims.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setIsNewModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-sm shadow-indigo-600/20 transition-all focus:ring-2 focus:ring-indigo-500"
        >
          <Plus className="w-4 h-4" />
          Submit New Claim
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Claims</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{claims.length}</p>
          <p className="text-xs text-slate-500 mt-1">Total value: ₹{totalAmount.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Pending Review</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
          <p className="text-xs text-slate-500 mt-1">Awaiting manager or HR signoff</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Approved for Payout</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{approvedCount}</p>
          <p className="text-xs text-slate-500 mt-1">Scheduled for payroll payment</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Settled & Paid</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{paidCount}</p>
          <p className="text-xs text-slate-500 mt-1">Processed successfully</p>
        </div>
      </div>

      {/* Control Bar: Tabs, Search & Status Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {isManager && (
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('team_claims')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'team_claims'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Team Claims ({claims.length})
              </button>
              <button
                onClick={() => setActiveTab('my_claims')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'my_claims'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                My Claims ({claims.filter((c) => c.employee === user?.id).length})
              </button>
            </div>
          )}

          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'PENDING', 'APPROVED', 'PAID', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${selectedStatus === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, employee, claim #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading reimbursement claims...</div>
        ) : visibleClaims.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No reimbursement claims found</p>
            <p className="text-xs text-slate-400">
              Submit your bills and receipts to get reimbursed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Claim Details</th>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Expense Date</th>
                  <th className="px-5 py-3.5 text-right">Amount</th>
                  <th className="px-5 py-3.5">Receipt</th>
                  <th className="px-5 py-3.5">Status</th>
                  {isManager && <th className="px-5 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {visibleClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800 text-sm">{claim.title}</p>
                      <p className="text-slate-400 text-[11px] font-mono mt-0.5">
                        {claim.claim_number}
                        {claim.merchant_name && ` • ${claim.merchant_name}`}
                      </p>
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800">{claim.employee_name}</p>
                      <p className="text-slate-400 text-[11px]">{claim.department_name || 'Staff'}</p>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium text-[11px]">
                        {claim.category_display || claim.category}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600">{claim.expense_date}</td>

                    <td className="px-5 py-3.5 text-right font-bold text-slate-900 text-sm">
                      {claim.currency} {Number(claim.amount).toFixed(2)}
                    </td>

                    <td className="px-5 py-3.5">
                      {claim.receipt_url ? (
                        <a
                          href={claim.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View Receipt
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      ) : (
                        <span className="text-slate-300 italic">No receipt</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      {getStatusBadge(claim.status)}
                      {claim.rejection_reason && (
                        <p className="text-[11px] text-rose-500 mt-1 max-w-xs truncate" title={claim.rejection_reason}>
                          Reason: {claim.rejection_reason}
                        </p>
                      )}
                      {claim.payment_reference && (
                        <p className="text-[11px] text-emerald-600 mt-1 font-mono">
                          Ref: {claim.payment_reference}
                        </p>
                      )}
                    </td>

                    {isManager && (
                      <td className="px-5 py-3.5 text-right">
                        {claim.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setSelectedClaim(claim);
                              setReviewAction('APPROVE');
                              setReviewComments('');
                              setReviewError('');
                              setIsReviewModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition-colors"
                          >
                            Review
                          </button>
                        )}
                        {claim.status === 'APPROVED' && isHR && (
                          <button
                            onClick={() => {
                              setSelectedClaim(claim);
                              setReviewAction('MARK_PAID');
                              setPaymentRef('');
                              setReviewError('');
                              setIsReviewModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-xs transition-colors"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: SUBMIT NEW REIMBURSEMENT CLAIM */}
      {/* ============================================================== */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                Submit Reimbursement Claim
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClaim} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Claim Title / Purpose *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flight ticket to Bangalore client meeting"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expense Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ReimbursementCategory)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Total Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Merchant / Vendor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Indigo Airlines / Uber / Hotel Novotel"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Receipt Attachment (PDF/Image)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Business Justification</label>
                <textarea
                  rows={2}
                  placeholder="Add details regarding the business necessity of this expense..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REVIEW / APPROVE / REJECT / PAY CLAIM */}
      {/* ============================================================== */}
      {isReviewModalOpen && selectedClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Review Expense Claim</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedClaim.claim_number}</p>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Claim Summary */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Employee:</span>
                <span className="font-semibold text-slate-800">{selectedClaim.employee_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Title:</span>
                <span className="font-semibold text-slate-800">{selectedClaim.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-indigo-600 text-sm">
                  {selectedClaim.currency} {Number(selectedClaim.amount).toFixed(2)}
                </span>
              </div>
              {selectedClaim.receipt_url && (
                <div className="pt-1">
                  <a
                    href={selectedClaim.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Inspect Uploaded Receipt
                  </a>
                </div>
              )}
            </div>

            {reviewError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Select Action</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction('APPROVE')}
                    className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all ${reviewAction === 'APPROVE'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    Approve
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewAction('REJECT')}
                    className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all ${reviewAction === 'REJECT'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    Reject
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewAction('MARK_PAID')}
                    className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all ${reviewAction === 'MARK_PAID'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    Mark Paid
                  </button>
                </div>
              </div>

              {reviewAction === 'MARK_PAID' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Bank / Transaction Reference Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-8948194"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Comments / Justification {reviewAction === 'REJECT' && '*'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    reviewAction === 'REJECT'
                      ? 'State the reason for rejecting this claim...'
                      : 'Optional approval notes...'
                  }
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewing}
                  className={`px-5 py-2 text-white font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 ${reviewAction === 'APPROVE'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : reviewAction === 'REJECT'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                >
                  {reviewing ? 'Processing...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
