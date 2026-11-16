import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { User, LeaveType, Department, Holiday, Role } from '../api/types';
import {
  Users,
  Plus,
  Briefcase,
  CheckCircle2,
  Settings,
  AlertCircle,
  Search,
  Building,
  X,
  Edit2,
  Trash2,
  UserPlus,
  CalendarDays,
  Power,
} from 'lucide-react';

interface HRManagementProps {
  defaultTab?: 'DEPARTMENTS' | 'EMPLOYEES' | 'HOLIDAYS' | 'LEAVE_TYPES';
}

export const HRManagement: React.FC<HRManagementProps> = ({ defaultTab = 'DEPARTMENTS' }) => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'DEPARTMENTS' | 'EMPLOYEES' | 'HOLIDAYS' | 'LEAVE_TYPES'>(defaultTab);

  const [employees, setEmployees] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'EMPLOYEE' | 'INTERN' | 'MANAGER' | 'HR_MANAGER' | 'ADMIN'>('ALL');

  // Department Modal (Create / Edit)
  const [showDeptModal, setShowDeptModal] = useState<boolean>(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptDescription, setDeptDescription] = useState('');

  // Delete Confirmations
  const [itemToDelete, setItemToDelete] = useState<{ type: 'DEPT' | 'HOLIDAY' | 'LEAVE_TYPE'; id: number; name: string } | null>(null);

  // Employee Onboarding Modal
  const [showEmpModal, setShowEmpModal] = useState<boolean>(false);
  const [empEmail, setEmpEmail] = useState('');
  const [empFirstName, setEmpFirstName] = useState('');
  const [empLastName, setEmpLastName] = useState('');
  const [empRole, setEmpRole] = useState<Role>('EMPLOYEE');
  const [empDeptId, setEmpDeptId] = useState<string>('');
  const [empManagerId, setEmpManagerId] = useState<string>('');
  const [empPassword, setEmpPassword] = useState('WelcomePass123!');
  const [empDesignation, setEmpDesignation] = useState('');
  const [empJoiningDate, setEmpJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [empPhone, setEmpPhone] = useState('');

  // Holiday Modal (Create / Edit)
  const [showHolidayModal, setShowHolidayModal] = useState<boolean>(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [holidayDescription, setHolidayDescription] = useState('');

  // Allocate balance modal (with Carry-Forward)
  const [showAllocateModal, setShowAllocateModal] = useState<boolean>(false);
  const [allocEmpId, setAllocEmpId] = useState<number | ''>('');
  const [allocTypeId, setAllocTypeId] = useState<number | ''>('');
  const [allocDays, setAllocDays] = useState('15.0');
  const [allocCarryForward, setAllocCarryForward] = useState('0.0');

  // Leave Type Filter & Search
  const [leaveTypeSearch, setLeaveTypeSearch] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Leave Type Modal (Create / Edit)
  const [showTypeModal, setShowTypeModal] = useState<boolean>(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [typeAllowance, setTypeAllowance] = useState('12.0');
  const [typeDescription, setTypeDescription] = useState('');
  const [typeRequiresApproval, setTypeRequiresApproval] = useState(true);
  const [typeIsPaid, setTypeIsPaid] = useState(true);
  const [typeIsActive, setTypeIsActive] = useState(true);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, deptRes, typesRes, holRes] = await Promise.all([
        apiClient.get('/users/'),
        apiClient.get('/departments/'),
        apiClient.get('/leave/types/'),
        apiClient.get('/holidays/'),
      ]);
      setEmployees(empRes.data.results || empRes.data || []);
      setDepartments(deptRes.data.results || deptRes.data || []);
      setLeaveTypes(typesRes.data.results || typesRes.data || []);
      setHolidays(holRes.data.results || holRes.data || []);
    } catch (err) {
      console.error('Failed to load HR management data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'leave_types' || tabParam === 'leave-types' || tabParam === 'policies') {
      setActiveTab('LEAVE_TYPES');
    } else if (tabParam === 'departments') {
      setActiveTab('DEPARTMENTS');
    } else if (tabParam === 'employees') {
      setActiveTab('EMPLOYEES');
    } else if (tabParam === 'holidays') {
      setActiveTab('HOLIDAYS');
    } else if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, searchParams]);

  // Department Handlers
  const openCreateDept = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptDescription('');
    setActionError(null);
    setShowDeptModal(true);
  };

  const openEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptDescription(dept.description || '');
    setActionError(null);
    setShowDeptModal(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      if (editingDept) {
        await apiClient.patch(`/departments/${editingDept.id}/`, {
          name: deptName,
          description: deptDescription,
        });
        setActionSuccess(`Department "${deptName}" updated successfully.`);
      } else {
        await apiClient.post('/departments/', {
          name: deptName,
          description: deptDescription,
        });
        setActionSuccess(`Department "${deptName}" created successfully.`);
      }
      setShowDeptModal(false);
      fetchData();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || err.response?.data?.name?.[0] || 'Failed to save department.');
    }
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    setActionError(null);
    try {
      if (itemToDelete.type === 'DEPT') {
        await apiClient.delete(`/departments/${itemToDelete.id}/`);
        setActionSuccess(`Department "${itemToDelete.name}" was deleted.`);
      } else if (itemToDelete.type === 'HOLIDAY') {
        await apiClient.delete(`/holidays/${itemToDelete.id}/`);
        setActionSuccess(`Holiday "${itemToDelete.name}" was removed from the calendar.`);
      } else if (itemToDelete.type === 'LEAVE_TYPE') {
        await apiClient.delete(`/leave/types/${itemToDelete.id}/`);
        setActionSuccess(`Leave policy "${itemToDelete.name}" was deleted.`);
      }
      setItemToDelete(null);
      fetchData();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to delete item.');
    }
  };

  // Holiday Handlers
  const openCreateHoliday = () => {
    setEditingHoliday(null);
    setHolidayDate('');
    setHolidayName('');
    setHolidayDescription('');
    setActionError(null);
    setShowHolidayModal(true);
  };

  const openEditHoliday = (hol: Holiday) => {
    setEditingHoliday(hol);
    setHolidayDate(hol.date);
    setHolidayName(hol.name);
    setHolidayDescription(hol.description || '');
    setActionError(null);
    setShowHolidayModal(true);
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    const trimmed = holidayDate.trim();
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    const cleanDate = dmyMatch ? `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}` : trimmed;

    try {
      if (editingHoliday) {
        await apiClient.patch(`/holidays/${editingHoliday.id}/`, {
          date: cleanDate,
          name: holidayName.trim(),
          description: holidayDescription.trim(),
        });
        setActionSuccess(`Holiday "${holidayName}" updated.`);
      } else {
        await apiClient.post('/holidays/', {
          date: cleanDate,
          name: holidayName.trim(),
          description: holidayDescription.trim(),
        });
        setActionSuccess(`Holiday "${holidayName}" scheduled on ${cleanDate}.`);
      }
      setShowHolidayModal(false);
      fetchData();
    } catch (err: any) {
      const data = err.response?.data;
      let errMsg = 'Failed to save holiday.';
      if (typeof data === 'string') errMsg = data;
      else if (data?.detail) errMsg = data.detail;
      else if (data?.message) errMsg = data.message;
      else if (data && typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          const val = data[firstKey];
          errMsg = Array.isArray(val) ? `${firstKey !== 'non_field_errors' ? `${firstKey}: ` : ''}${val[0]}` : String(val);
        }
      }
      setActionError(errMsg);
    }
  };

  // Employee Onboarding Handler
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await apiClient.post('/users/', {
        email: empEmail,
        first_name: empFirstName,
        last_name: empLastName,
        role: empRole,
        password: empPassword,
        department_id: empDeptId ? Number(empDeptId) : null,
        manager_id: empManagerId ? Number(empManagerId) : null,
        designation: empDesignation,
        joining_date: empJoiningDate,
        phone_number: empPhone,
      });
      setShowEmpModal(false);
      setActionSuccess(`Onboarded ${empFirstName} ${empLastName} (${empRole}) to the organization.`);
      fetchData();
      setEmpEmail('');
      setEmpFirstName('');
      setEmpLastName('');
      setEmpDesignation('');
      setEmpDeptId('');
      setEmpManagerId('');
      setEmpPhone('');
    } catch (err: any) {
      setActionError(
        err.response?.data?.detail ||
          err.response?.data?.email?.[0] ||
          'Failed to complete employee onboarding.'
      );
    }
  };

  // Leave Type Handlers (Admin CRUD & Status Toggle)
  const openCreateLeaveType = () => {
    setEditingType(null);
    setTypeName('');
    setTypeCode('');
    setTypeAllowance('12.0');
    setTypeDescription('');
    setTypeRequiresApproval(true);
    setTypeIsPaid(true);
    setTypeIsActive(true);
    setActionError(null);
    setShowTypeModal(true);
  };

  const openEditLeaveType = (lt: LeaveType) => {
    setEditingType(lt);
    setTypeName(lt.name);
    setTypeCode(lt.code);
    setTypeAllowance(String(lt.annual_allowance));
    setTypeDescription(lt.description || '');
    setTypeRequiresApproval(lt.requires_approval);
    setTypeIsPaid(lt.is_paid);
    setTypeIsActive(lt.is_active);
    setActionError(null);
    setShowTypeModal(true);
  };

  const handleSaveLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const payload = {
        name: typeName.trim(),
        code: typeCode.trim().toUpperCase(),
        annual_allowance: typeAllowance,
        description: typeDescription.trim(),
        requires_approval: typeRequiresApproval,
        is_paid: typeIsPaid,
        is_active: typeIsActive,
      };

      if (editingType) {
        await apiClient.patch(`/leave/types/${editingType.id}/`, payload);
        setActionSuccess(`Leave policy "${typeName}" updated successfully.`);
      } else {
        await apiClient.post('/leave/types/', payload);
        setActionSuccess(`Leave policy "${typeName}" created successfully.`);
      }
      setShowTypeModal(false);
      fetchData();
    } catch (err: any) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.name?.[0] ||
        err.response?.data?.code?.[0] ||
        err.response?.data?.annual_allowance?.[0] ||
        'Failed to save leave policy.';
      setActionError(detail);
    }
  };

  const handleToggleActiveLeaveType = async (lt: LeaveType) => {
    setActionError(null);
    try {
      await apiClient.post(`/leave/types/${lt.id}/toggle-active/`);
      setActionSuccess(`Leave policy "${lt.name}" is now ${lt.is_active ? 'deactivated' : 'activated'}.`);
      fetchData();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to toggle policy status.');
    }
  };

  // Balance Allocation Handler (with carry-forward)
  const handleAllocateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await apiClient.post('/leave/balance/allocate/', {
        employee_id: allocEmpId,
        leave_type_id: allocTypeId,
        allocated_days: allocDays,
        carried_forward_days: allocCarryForward,
        year: new Date().getFullYear(),
      });
      setShowAllocateModal(false);
      setActionSuccess('Annual allowance and carry-forward balance successfully allocated.');
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to allocate balance quota.');
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;
    const matchesSearch =
      emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.profile?.department_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.profile?.designation?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Admin & HR Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Department CRUD operations, employee onboarding & department assignments, holiday calendar control, and leave policies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => {
              setActionError(null);
              setShowAllocateModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-indigo-600 bg-blue-50/70 hover:bg-blue-100/70 text-xs font-semibold transition active:scale-95 shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Allocate Balance</span>
          </button>

          <button
            onClick={() => {
              setActionError(null);
              setShowEmpModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Onboard Employee</span>
          </button>
        </div>
      </div>

      {/* Action Alerts */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium text-emerald-950">{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-red-50 text-rose-600 border border-red-200 rounded-xl text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-red-700 hover:text-red-900 font-bold ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Navigation Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-xs flex flex-wrap items-center gap-1">
        <button
          onClick={() => setActiveTab('DEPARTMENTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'DEPARTMENTS'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Departments</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'DEPARTMENTS' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {departments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('EMPLOYEES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'EMPLOYEES'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Employees & Interns</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'EMPLOYEES' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {employees.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('HOLIDAYS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'HOLIDAYS'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Holiday Calendar (CRUD)</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'HOLIDAYS' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {holidays.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('LEAVE_TYPES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'LEAVE_TYPES'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Leave Policies</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'LEAVE_TYPES' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {leaveTypes.length}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading organization records...</span>
        </div>
      ) : (
        <>
          {/* Tab 1: DEPARTMENTS (Admin CRUD) */}
          {activeTab === 'DEPARTMENTS' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">
              Create, edit, and organize corporate departments. Employees and interns are assigned to these departments during onboarding.
            </p>
            <button
              onClick={openCreateDept}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Department</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((d) => (
              <div
                key={d.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-600/30 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                        <Building className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{d.name}</h3>
                        <span className="text-[10px] font-semibold text-slate-500">ID #{d.id}</span>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                      {d.employee_count ?? 0} {d.employee_count === 1 ? 'member' : 'members'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-3 min-h-[36px] leading-relaxed">
                    {d.description || 'Corporate software department.'}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    Dept Operations
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditDept(d)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-blue-50 transition"
                      title="Edit department"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setItemToDelete({ type: 'DEPT', id: d.id, name: d.name })}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-red-50 transition"
                      title="Delete department"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: EMPLOYEES & ONBOARDING */}
      {activeTab === 'EMPLOYEES' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search staff by name, email, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {(['ALL', 'EMPLOYEE', 'INTERN', 'MANAGER', 'HR_MANAGER', 'ADMIN'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                    roleFilter === r
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {r === 'ALL'
                    ? 'All Staff'
                    : r === 'INTERN'
                    ? 'Interns'
                    : r === 'HR_MANAGER'
                    ? 'HR Managers'
                    : r === 'ADMIN'
                    ? 'Admins'
                    : r === 'MANAGER'
                    ? 'Team Leads'
                    : 'Employees'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Assigned Department</th>
                    <th className="py-3.5 px-4">Designation</th>
                    <th className="py-3.5 px-4">Reporting Manager</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No team members found matching the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-indigo-600 text-xs shrink-0">
                              {emp.first_name ? emp.first_name[0] : emp.email[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{emp.full_name}</p>
                              <p className="text-[11px] text-slate-500">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              emp.role === 'ADMIN'
                                ? 'bg-blue-50 text-indigo-600 border-blue-200'
                                : emp.role === 'HR_MANAGER'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : emp.role === 'INTERN'
                                ? 'bg-amber-50 text-amber-600 border-amber-200'
                                : emp.role === 'MANAGER'
                                ? 'bg-blue-50 text-indigo-700 border-blue-200'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            }`}
                          >
                            {emp.role === 'HR_MANAGER' ? 'HR Manager' : emp.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <span className="inline-flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            {emp.profile?.department_name || 'Unassigned'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-medium">
                          {emp.profile?.designation || 'Staff'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-900 font-medium">
                          {emp.profile?.manager_name || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setAllocEmpId(emp.id);
                              setShowAllocateModal(true);
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-bold px-2 py-1 rounded-lg hover:bg-blue-50 transition"
                          >
                            Allocate Quota
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: HOLIDAY CALENDAR (Admin Add, Edit, Delete CRUD) */}
      {activeTab === 'HOLIDAYS' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">
              Manage enterprise public holidays. Days scheduled here are automatically excluded from leave calculations and weekend counts.
            </p>
            <button
              onClick={openCreateHoliday}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Holiday</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {holidays.map((h) => {
              const d = new Date(h.date + 'T00:00:00');
              const monthStr = d.toLocaleDateString(undefined, { month: 'short' });
              const dayStr = d.getDate();
              const weekdayStr = d.toLocaleDateString(undefined, { weekday: 'long' });

              return (
                <div
                  key={h.id}
                  className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-indigo-600 font-bold flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] uppercase font-bold text-indigo-600">
                        {monthStr}
                      </span>
                      <span className="text-base font-black leading-none mt-0.5">
                        {dayStr}
                      </span>
                    </div>

                    <div>
                      <p className="font-bold text-slate-900 text-xs sm:text-sm">{h.name}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        {weekdayStr} • {h.description || 'Public company holiday'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                      {h.date}
                    </span>
                    <button
                      onClick={() => openEditHoliday(h)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-blue-50 transition"
                      title="Edit holiday"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setItemToDelete({ type: 'HOLIDAY', id: h.id, name: h.name })}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-red-50 transition"
                      title="Delete holiday"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: LEAVE POLICIES (Admin Full CRUD) */}
      {activeTab === 'LEAVE_TYPES' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <p className="text-xs text-slate-500">
                Configure corporate leave categories, annual allowances, paid status, and approval workflows.
              </p>
            </div>
            <button
              onClick={openCreateLeaveType}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Leave Policy</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Total Categories</span>
              <span className="text-lg font-bold text-slate-900 mt-0.5 block">{leaveTypes.length}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Active Policies</span>
              <span className="text-lg font-bold text-emerald-600 mt-0.5 block">
                {leaveTypes.filter((lt) => lt.is_active).length}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Paid Leave Types</span>
              <span className="text-lg font-bold text-indigo-600 mt-0.5 block">
                {leaveTypes.filter((lt) => lt.is_paid).length}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Requires Approval</span>
              <span className="text-lg font-bold text-amber-600 mt-0.5 block">
                {leaveTypes.filter((lt) => lt.requires_approval).length}
              </span>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search category name, code, or description..."
                value={leaveTypeSearch}
                onChange={(e) => setLeaveTypeSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium mr-1 hidden sm:inline">Status:</span>
              {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setLeaveTypeFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    leaveTypeFilter === filter
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {filter === 'ALL' ? 'All' : filter === 'ACTIVE' ? 'Active' : 'Inactive'}
                </button>
              ))}
            </div>
          </div>

          {/* Leave Types Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaveTypes
              .filter((lt) => {
                const matchesFilter =
                  leaveTypeFilter === 'ALL'
                    ? true
                    : leaveTypeFilter === 'ACTIVE'
                    ? lt.is_active
                    : !lt.is_active;
                const matchesSearch =
                  lt.name.toLowerCase().includes(leaveTypeSearch.toLowerCase()) ||
                  lt.code.toLowerCase().includes(leaveTypeSearch.toLowerCase()) ||
                  (lt.description && lt.description.toLowerCase().includes(leaveTypeSearch.toLowerCase()));
                return matchesFilter && matchesSearch;
              })
              .map((lt) => (
                <div
                  key={lt.id}
                  className={`bg-white p-5 rounded-xl border transition shadow-xs flex flex-col justify-between ${
                    lt.is_active ? 'border-slate-200 hover:border-blue-200' : 'border-slate-200 bg-slate-50/50 opacity-90'
                  }`}
                >
                  <div>
                    {/* Top Row: Title, Code, & Management Actions */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">
                          {lt.code}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 tracking-tight">{lt.name}</h3>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleActiveLeaveType(lt)}
                          className={`p-1.5 rounded-lg transition ${
                            lt.is_active
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-500 hover:text-emerald-600 hover:bg-slate-100'
                          }`}
                          title={lt.is_active ? 'Deactivate policy' : 'Activate policy'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => openEditLeaveType(lt)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-blue-50 transition"
                          title="Edit policy details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setItemToDelete({ type: 'LEAVE_TYPE', id: lt.id, name: lt.name })}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-red-50 transition"
                          title="Delete policy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mt-2.5 min-h-[38px] leading-relaxed line-clamp-2">
                      {lt.description || 'No detailed policy description provided.'}
                    </p>

                    {/* Policy Trait Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          lt.is_active
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {lt.is_active ? 'Active' : 'Deactivated'}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          lt.is_paid
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-amber-50 text-amber-600 border-amber-200'
                        }`}
                      >
                        {lt.is_paid ? 'Paid' : 'Unpaid'}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          lt.requires_approval
                            ? 'bg-blue-50 text-indigo-600 border-blue-200'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        }`}
                      >
                        {lt.requires_approval ? 'Approval Required' : 'Auto-Approved'}
                      </span>
                    </div>
                  </div>

                  {/* Card Bottom: Allowance & Quick Edit */}
                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-medium">Annual Quota</span>
                      <span className="text-sm font-bold text-slate-900">
                        {lt.annual_allowance} <span className="text-xs font-normal text-slate-500">days/yr</span>
                      </span>
                    </div>

                    <button
                      onClick={() => openEditLeaveType(lt)}
                      className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-blue-50 rounded-lg transition"
                    >
                      Configure &rarr;
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {leaveTypes.length === 0 && (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <Briefcase className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-slate-900">No leave policies defined yet.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Click "Create Leave Policy" to establish vacation, sick leave, or company allowances.
              </p>
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* DEPARTMENT MODAL (Create & Edit) */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingDept ? 'Edit Department' : 'Create New Department'}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Admin CRUD: Manage company software engineering & operational departments.
                </p>
              </div>
              <button
                onClick={() => setShowDeptModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Department Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Assurance"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Responsibilities, scope, and technical domain..."
                  value={deptDescription}
                  onChange={(e) => setDeptDescription(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none text-slate-900 shadow-2xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  {editingDept ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HOLIDAY MODAL (Create & Edit) */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingHoliday ? 'Edit Corporate Holiday' : 'Schedule Public Holiday'}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Holidays are automatically deducted from leave working day spans.
                </p>
              </div>
              <button
                onClick={() => setShowHolidayModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Holiday Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Thanksgiving Day"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Official national public holiday"
                  value={holidayDescription}
                  onChange={(e) => setHolidayDescription(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 shadow-2xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowHolidayModal(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  {editingHoliday ? 'Update Holiday' : 'Save Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMPLOYEE ONBOARDING MODAL */}
      {showEmpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Employee & Intern Onboarding</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Input personal details and assign to a department and reporting manager.
                </p>
              </div>
              <button
                onClick={() => setShowEmpModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={empFirstName}
                    onChange={(e) => setEmpFirstName(e.target.value)}
                    placeholder="Leo"
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={empLastName}
                    onChange={(e) => setEmpLastName(e.target.value)}
                    placeholder="Chen"
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="leo.chen@ems.local"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Organizational Role
                  </label>
                  <select
                    value={empRole}
                    onChange={(e: any) => setEmpRole(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-2xs"
                  >
                    <option value="INTERN">Intern (Software Intern)</option>
                    <option value="EMPLOYEE">Employee (Full-Time Engineer)</option>
                    <option value="MANAGER">Team Manager / Lead</option>
                    <option value="HR_MANAGER">HR Manager</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Assign Department
                  </label>
                  <select
                    value={empDeptId}
                    onChange={(e) => setEmpDeptId(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-2xs"
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Job Designation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Frontend Intern / Senior Engineer"
                    value={empDesignation}
                    onChange={(e) => setEmpDesignation(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Reporting Manager / Mentor
                  </label>
                  <select
                    value={empManagerId}
                    onChange={(e) => setEmpManagerId(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-2xs"
                  >
                    <option value="">None (Reports to Leadership)</option>
                    {employees
                      .filter((e) => e.role === 'MANAGER' || e.role === 'ADMIN' || e.role === 'HR_MANAGER')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name} ({m.email})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={empJoiningDate}
                    onChange={(e) => setEmpJoiningDate(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Direct Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 555-0199"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Default Access Password
                </label>
                <input
                  type="text"
                  required
                  value={empPassword}
                  onChange={(e) => setEmpPassword(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-slate-900 shadow-2xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEmpModal(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  Complete Onboarding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ALLOCATE BALANCE MODAL (With Carry-Forward) */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Allocate Quota & Carry-Forward</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set annual fresh allowance and carry-forward days for an employee.
                </p>
              </div>
              <button
                onClick={() => setShowAllocateModal(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAllocateBalance} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-900 uppercase mb-1">
                  Employee
                </label>
                <select
                  required
                  value={allocEmpId}
                  onChange={(e) => setAllocEmpId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-900 uppercase mb-1">
                  Leave Category
                </label>
                <select
                  required
                  value={allocTypeId}
                  onChange={(e) => setAllocTypeId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">Select Category...</option>
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-900 uppercase mb-1">
                    Annual Quota (Days)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={allocDays}
                    onChange={(e) => setAllocDays(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-900 uppercase mb-1">
                    Carry-Forward (Days)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={allocCarryForward}
                    onChange={(e) => setAllocCarryForward(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95"
                >
                  Save Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAVE TYPE MODAL (Create & Edit) */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingType ? 'Edit Leave Policy' : 'Create New Leave Policy'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure corporate entitlement quota, approval workflow, and availability.
                </p>
              </div>
              <button
                onClick={() => setShowTypeModal(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLeaveType} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-900 uppercase mb-1">
                  Policy Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parental / Maternity Leave"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-900 uppercase mb-1">
                    Policy Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PL"
                    value={typeCode}
                    onChange={(e) => setTypeCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl uppercase font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Short unique identifier (e.g. CL, SL, WFH)</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-900 uppercase mb-1">
                    Annual Quota (Days) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={typeAllowance}
                    onChange={(e) => setTypeAllowance(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Default days granted per calendar year</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-900 uppercase mb-1">
                  Description & Guidelines
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain policy guidelines, eligibility requirements, documentation rules..."
                  value={typeDescription}
                  onChange={(e) => setTypeDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 resize-none"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={typeIsPaid}
                    onChange={(e) => setTypeIsPaid(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-600 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs text-slate-900 font-semibold block">Paid Leave Policy</span>
                    <span className="text-[11px] text-slate-500 block">
                      Employees receive normal salary remuneration during this leave span.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={typeRequiresApproval}
                    onChange={(e) => setTypeRequiresApproval(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-600 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs text-slate-900 font-semibold block">Requires Manager Review & Approval</span>
                    <span className="text-[11px] text-slate-500 block">
                      When disabled, submitted requests are auto-approved and deduct balances immediately.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={typeIsActive}
                    onChange={(e) => setTypeIsActive(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-600 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs text-slate-900 font-semibold block">Active Policy Status</span>
                    <span className="text-[11px] text-slate-500 block">
                      When enabled, this category appears in employee leave application dropdowns.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTypeModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95"
                >
                  {editingType ? 'Update Leave Policy' : 'Create Leave Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-red-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                Delete{' '}
                {itemToDelete.type === 'DEPT'
                  ? 'Department'
                  : itemToDelete.type === 'HOLIDAY'
                  ? 'Holiday'
                  : 'Leave Policy'}
                ?
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Are you sure you want to delete <strong className="text-slate-900">"{itemToDelete.name}"</strong>?
                {itemToDelete.type === 'LEAVE_TYPE' && (
                  <span className="block mt-1 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    If employee leave requests reference this policy, the system prevents accidental deletion; you can deactivate it instead.
                  </span>
                )}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="w-full px-4 py-2 bg-rose-600 hover:bg-red-600 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
