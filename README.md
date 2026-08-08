# SLAVE — Self-operating Logic & Autonomous Virtual Executor

> "Give it the problem. It handles the workflow."

SLAVE is an **autonomous support-workflow execution system**. 

Unlike generic ticket management dashboards where human agents manually click through stages, SLAVE takes over the entire lifecycle of a request. The user submits a task, and SLAVE executes it autonomously.

## 🚀 The Autonomous Pipeline

Every ticket submitted to SLAVE undergoes a strict, 5-stage automated pipeline:

1. **CLASSIFY (Understand)**: The Gemini LLM analyzes the raw customer request, extracting intent, category (e.g., technical, billing, account), priority, and department.
2. **DECIDE**: A deterministic rule engine evaluates the LLM's classification against strict business rules to determine the safest and most appropriate action (e.g., `resolve`, `escalate`, `create_incident`, `create_kb`).
3. **EXECUTE**: The execution engine dispatches the decided action to the operational backend. Secondary systems (incidents, escalations, knowledge bases) are updated autonomously.
4. **RESPOND**: A contextual, professional response is generated for the customer based on the actions taken.
5. **COMPLETE**: The ticket workflow is finalized, and a complete, timestamped audit log of every pipeline step is recorded.

## 🎨 Product Design

The interface features a bold **Neo-Brutalist** aesthetic. It intentionally avoids soft shadows and rounded corners in favor of stark contrast, thick black borders, hard-offset shadows, and structural typography. It is designed to look like an operational execution console, not a generic SaaS app.

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Tailwind CSS (Neo-Brutalist design system)
- **Backend**: Node.js, Express
- **Database**: SQLite (via `better-sqlite3`)
- **AI**: Google Gemini Pro (with a deterministic fallback engine)

## 📦 Getting Started

### Prerequisites
- Node.js 20.x
- A Gemini API Key (optional for running tests)

### Installation
1. Clone the repository.
2. Run the setup script to install dependencies and create your local `.env`:
   ```bash
   npm run setup
   ```
3. Add your `GEMINI_API_KEY` to `server/.env`.

### Development
Start both the React frontend and Express backend concurrently:
```bash
npm run dev
```

### Production Build
Build the client and start the production Express server:
```bash
npm run build
npm start
```

## 🧪 Testing

SLAVE includes a comprehensive test suite that can run completely isolated from your production database and without a Gemini API Key.

```bash
npm test
```
The test suite utilizes a deterministic `AI_FALLBACK=true` mode and a temporary `test.db` to verify the rule engine, execution pipeline, and API endpoints reliably. For more details, see [TESTING.md](./TESTING.md).

## ☁️ Deployment

The project is configured for a single-service deployment (e.g., Render). The Express backend serves the Vite production build and handles SPA fallback routing.

- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Environment Variables**: `NODE_ENV=production`, `DATABASE_PATH=/var/data/slave.db` (if using a persistent disk), `GEMINI_API_KEY`.
