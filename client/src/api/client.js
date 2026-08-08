/**
 * API client for interacting with the SLAVE backend.
 */

const BASE = '/api';

async function fetcher(endpoint, options = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'API request failed');
  }
  return data;
}

export const api = {
  // Metrics
  getMetrics: () => fetcher('/tickets/metrics/summary'),
  
  // Tickets
  getTickets: (limit = 50) => fetcher(`/tickets?limit=${limit}`),
  getTicket: (id) => fetcher(`/tickets/${id}`),
  createTicket: (payload) => fetcher('/tickets', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Automation
  automateTicket: (id) => fetcher(`/tickets/${id}/automate`, {
    method: 'POST',
  }),
};
