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
    <div className="neo-box-lg flex flex-col">
      <h2 className="text-xl font-bold p-6 border-b-4 border-base-border bg-base-surface uppercase tracking-widest text-text-primary">NEW REQUEST</h2>
      
      {error && (
        <div className="m-6 p-4 bg-accent-red text-base-surface font-bold border-3 border-base-border shadow-neo">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-base-bg flex-1">
        <div className="space-y-2">
          <label className="label text-sm">CUSTOMER</label>
          <input 
            required
            type="text" 
            className="w-full bg-base-surface border-3 border-base-border p-3 text-base font-bold focus:outline-none focus:ring-4 focus:ring-accent-yellow transition-all"
            value={formData.customer_name}
            onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
            placeholder="Zoe Martin"
          />
        </div>

        <div className="space-y-2">
          <label className="label text-sm">EMAIL</label>
          <input 
            required
            type="email" 
            className="w-full bg-base-surface border-3 border-base-border p-3 text-base font-bold focus:outline-none focus:ring-4 focus:ring-accent-yellow transition-all"
            value={formData.customer_email}
            onChange={e => setFormData({ ...formData, customer_email: e.target.value })}
            placeholder="zoe@example.com"
          />
        </div>

        <div className="space-y-2">
          <label className="label text-sm">SUBJECT</label>
          <input 
            required
            type="text" 
            className="w-full bg-base-surface border-3 border-base-border p-3 text-base font-bold focus:outline-none focus:ring-4 focus:ring-accent-yellow transition-all"
            value={formData.subject}
            onChange={e => setFormData({ ...formData, subject: e.target.value })}
            placeholder="Internet completely down"
          />
        </div>

        <div className="space-y-2 flex flex-col">
          <label className="label text-sm">REQUEST</label>
          <textarea 
            required
            rows={5}
            className="w-full bg-base-surface border-3 border-base-border p-3 text-base font-bold focus:outline-none focus:ring-4 focus:ring-accent-yellow transition-all resize-none leading-relaxed"
            value={formData.body}
            onChange={e => setFormData({ ...formData, body: e.target.value })}
            placeholder="My internet has been completely down since yesterday..."
          />
        </div>

        <div className="pt-6">
          <button 
            type="submit" 
            disabled={loading}
            className="w-full neo-btn text-lg"
          >
            {loading ? 'SUBMITTING...' : 'CREATE TICKET →'}
          </button>
        </div>
      </form>
    </div>
  );
}
