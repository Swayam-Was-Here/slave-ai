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
    <div className="border border-base-border bg-base-surface p-6 rounded">
      <h2 className="text-sm font-semibold mb-6 uppercase tracking-wider text-text-primary">New Intake</h2>
      
      {error && (
        <div className="mb-6 p-3 bg-status-failed/10 border border-status-failed/20 text-status-failed text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="label">Customer Name</label>
            <input 
              required
              type="text" 
              className="w-full bg-base-bg border border-base-border rounded px-3 py-2 text-sm focus:outline-none focus:border-text-secondary transition-colors"
              value={formData.customer_name}
              onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="label">Customer Email</label>
            <input 
              required
              type="email" 
              className="w-full bg-base-bg border border-base-border rounded px-3 py-2 text-sm focus:outline-none focus:border-text-secondary transition-colors"
              value={formData.customer_email}
              onChange={e => setFormData({ ...formData, customer_email: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="label">Subject</label>
          <input 
            required
            type="text" 
            className="w-full bg-base-bg border border-base-border rounded px-3 py-2 text-sm focus:outline-none focus:border-text-secondary transition-colors"
            value={formData.subject}
            onChange={e => setFormData({ ...formData, subject: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <label className="label">Description</label>
          <textarea 
            required
            rows={4}
            className="w-full bg-base-bg border border-base-border rounded px-3 py-2 text-sm focus:outline-none focus:border-text-secondary transition-colors resize-none"
            value={formData.body}
            onChange={e => setFormData({ ...formData, body: e.target.value })}
          />
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-text-primary text-base-bg px-6 py-2 text-sm font-semibold rounded hover:bg-text-secondary transition-colors disabled:opacity-50"
          >
            {loading ? 'SUBMITTING...' : 'CREATE TICKET'}
          </button>
        </div>
      </form>
    </div>
  );
}
