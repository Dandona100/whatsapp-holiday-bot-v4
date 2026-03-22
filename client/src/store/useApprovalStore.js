import { create } from 'zustand';
import api from '../hooks/useApi';
import toast from 'react-hot-toast';

const useApprovalStore = create((set, get) => ({
  approvals: [],
  pendingCount: 0,

  fetchApprovals: async (status = '') => {
    try {
      const params = status ? { status } : {};
      const res = await api.get('/approvals', { params });
      const approvals = res.data.approvals || res.data || [];
      const pendingCount = approvals.filter((a) => a.status === 'pending').length;
      set({ approvals, pendingCount });
    } catch (err) {
      console.error('Failed to fetch approvals:', err);
    }
  },

  approve: async (id) => {
    try {
      await api.post(`/approvals/${id}/approve`);
      toast.success('Approval granted');
      get().fetchApprovals();
    } catch (err) {
      toast.error('Failed to approve');
    }
  },

  reject: async (id) => {
    try {
      await api.post(`/approvals/${id}/reject`);
      toast.success('Approval rejected');
      get().fetchApprovals();
    } catch (err) {
      toast.error('Failed to reject');
    }
  },
}));

export default useApprovalStore;
