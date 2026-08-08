import React, { useState } from 'react';
import { api } from '../api/client';

export function TicketForm({ onTicketCreated }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    subject: '',
    body: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.createTicket(formData);
      setFormData({ customer_name: '', customer_email: '', subject: '', body: '' });
      if (onTicketCreated) onTicketCreated(res.ticket.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-base-border bg-base-surface p-6 rounded shadow-sm">
      <h2 className="text-sm font-semibold mb-6 uppercase tracking-wider text-text-primary">NEW REQUEST</h2>
      
      {error && (
        <div className="mb-6 p-3 bg-status-failed/10 border border-status-failed/20 text-status-failed text-sm rounded-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="label">CUSTOMER</label>
            <input 
              required
              type="text" 
              className="w-full bg-base-bg border border-base-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-text-secondary transition-colors"
              value={formData.customer_name}
              onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="label">EMAIL</label>
            <input 
              required
              type="email" 
              className="w-full bg-base-bg border border-base-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-text-secondary transition-colors"
              value={formData.customer_email}
              onChange={e => setFormData({ ...formData, customer_email: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="label">SUBJECT</label>
          <input 
            required
            type="text" 
            className="w-full bg-base-bg border border-base-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-text-secondary transition-colors"
            value={formData.subject}
            onChange={e => setFormData({ ...formData, subject: e.target.value })}
          />
        </div>

        <div className="space-y-2 flex flex-col flex-1">
          <label className="label">REQUEST</label>
          <textarea 
            required
            rows={5}
            className="w-full bg-base-bg border border-base-border rounded-sm px-3 py-3 text-sm focus:outline-none focus:border-text-secondary transition-colors resize-none leading-relaxed"
            value={formData.body}
            onChange={e => setFormData({ ...formData, body: e.target.value })}
          />
        </div>

        <div className="pt-4 border-t border-base-border mt-4">
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-text-primary text-base-bg py-3 text-sm font-semibold rounded-sm hover:bg-text-secondary transition-colors disabled:opacity-50 tracking-widest uppercase"
          >
            {loading ? 'SUBMITTING...' : 'CREATE TICKET'}
          </button>
        </div>
      </form>
    </div>
  );
}
