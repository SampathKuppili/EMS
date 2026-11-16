import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { EmployeeDocument, DocumentCategory, User } from '../api/types';
import {
  FileText,
  Upload,
  Search,
  Download,
  Trash2,
  Calendar,
  X,
  AlertCircle,
} from 'lucide-react';

const CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'ID_PROOF', label: 'Identity Proof (Passport, Gov ID, etc.)' },
  { value: 'CONTRACT', label: 'Employment Contract & Offer' },
  { value: 'CERTIFICATE', label: 'Degree / Professional Certificate' },
  { value: 'TAX_DOCUMENT', label: 'Tax Declaration / W-2 / Form 16' },
  { value: 'PAYSLIP', label: 'Historical Salary / Payslip' },
  { value: 'OTHER', label: 'Other Document' },
];

export const Documents: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || Boolean(user?.is_admin);
  const isHR = isAdmin || user?.role === 'HR_MANAGER' || Boolean(user?.is_hr);

  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadEmployeeId, setUploadEmployeeId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('ID_PROOF');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/documents/documents/');
      setDocuments(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to load employee documents', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!isHR) return;
    try {
      const res = await apiClient.get('/users/');
      setEmployees(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to fetch employee list', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchEmployees();
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');

    if (!docFile || !title) {
      setUploadError('Please provide a document title and select a file.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('document_file', docFile);
      if (expiryDate) formData.append('expiry_date', expiryDate);
      if (notes) formData.append('notes', notes);
      if (isHR && uploadEmployeeId) {
        formData.append('employee', uploadEmployeeId);
      }

      await apiClient.post('/documents/documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setIsUploadModalOpen(false);
      setTitle('');
      setExpiryDate('');
      setNotes('');
      setDocFile(null);
      setUploadEmployeeId('');
      fetchDocuments();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to upload document.';
      setUploadError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await apiClient.delete(`/documents/documents/${id}/`);
      fetchDocuments();
    } catch (err) {
      console.error('Failed to delete document', err);
    }
  };

  const visibleDocs = documents.filter((doc) => {
    if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchEmp = doc.employee_name.toLowerCase().includes(q);
      const matchFile = doc.file_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchEmp && !matchFile) return false;
    }
    return true;
  });

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600" />
            Document Management Vault
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Secure enterprise repository for employee contracts, identification, compliance, and tax forms.
          </p>
        </div>

        <button
          onClick={() => {
            setUploadError('');
            setIsUploadModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-sm shadow-indigo-600/20 transition-all focus:ring-2 focus:ring-indigo-500"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Documents</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{documents.length}</p>
          <p className="text-xs text-slate-500 mt-1">Across all authorized folders</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Contracts & Offers</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {documents.filter((d) => d.category === 'CONTRACT').length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Signed corporate agreements</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Identity & Verification</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {documents.filter((d) => d.category === 'ID_PROOF').length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Verified official IDs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">Tax & Certifications</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {documents.filter((d) => ['CERTIFICATE', 'TAX_DOCUMENT'].includes(d.category)).length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Compliance & filings</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                selectedCategory === cat.value
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label.split('(')[0].trim()}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents or staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Document Grid / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading documents repository...</div>
        ) : visibleDocs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No documents found</p>
            <p className="text-xs text-slate-400">
              Upload identification, contracts, or tax declarations to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Document Title</th>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">File Details</th>
                  <th className="px-5 py-3.5">Uploaded</th>
                  <th className="px-5 py-3.5">Expiry</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {visibleDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{doc.title}</p>
                          {doc.notes && <p className="text-slate-400 text-[11px] truncate max-w-xs">{doc.notes}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800">{doc.employee_name}</p>
                      <p className="text-slate-400 text-[11px]">{doc.employee_email}</p>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                        {doc.category_display || doc.category}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                      <p>{formatFileSize(doc.file_size_bytes)}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{doc.file_type || 'PDF/FILE'}</p>
                    </td>

                    <td className="px-5 py-3.5 text-slate-500">
                      <p>{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}</p>
                      <p className="text-[10px] text-slate-400">By {doc.uploaded_by_name}</p>
                    </td>

                    <td className="px-5 py-3.5">
                      {doc.expiry_date ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-700">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {doc.expiry_date}
                        </span>
                      ) : (
                        <span className="text-slate-300 italic text-[11px]">No expiry</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right space-x-2">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>

                      {(isAdmin || doc.uploaded_by === user?.id) && (
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: UPLOAD NEW DOCUMENT */}
      {/* ============================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                Upload Employee Document
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs font-sans">
              {isHR && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assign To Employee (Default: Self)
                  </label>
                  <select
                    value={uploadEmployeeId}
                    onChange={(e) => setUploadEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="">Upload for Myself ({user?.full_name})</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Passport Copy - Renewed 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DocumentCategory)}
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
                  <label className="block font-semibold text-slate-700 mb-1">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document File *</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <p className="text-[11px] text-slate-400 mt-1">Accepts PDF, JPG, PNG, DOCX (Max 25MB)</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional annotations or reference IDs..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Save & Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
