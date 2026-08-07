# 🏥 MEDICOBOT — AI-Powered OPD Voice Triage & Kiosk System

> An intelligent, multilingual voice kiosk designed to eliminate hospital OPD waiting lines, automate department routing, and sync real-time consultation data with doctors.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://medicobot-zeta.vercel.app/)
[![Framework](https://img.shields.io/badge/Next.js-14-blue?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Database-Supabase-emerald?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Primary AI](https://img.shields.io/badge/AI Engine-Groq%20Llama%203.3-orange?style=for-the-badge)](https://groq.com/)

---

## 🌐 Live Production Application
🔗 **Live Kiosk & Doctor Dashboard:** [https://medicobot-zeta.vercel.app/](https://medicobot-zeta.vercel.app/)

---

## ✨ Key Features & Technical Highlights

- 🎙️ **Noise-Resilient Speech-to-Text (DSP Filtered):** Integrates Web Audio API High-Pass digital signal processing to filter out high-decibel ambient hospital noise for accurate voice capture.
- 🌐 **Multilingual Voice Interaction:** Offers accessible, localized audio triage and step-by-step room navigation for diverse patient demographics.
- ⚡ **Resilient Multi-Provider AI Fallback Engine:** 
  - **Primary:** Groq Cloud API (`llama-3.3-70b-versatile`) for sub-second clinical triage responses.
  - **Failover:** Automatic failover routing to Google Gemini (`gemini-1.5-flash`) and OpenAI (`gpt-4o-mini`) to guarantee 99.9% uptime.
- 📍 **Smart Department & Room Navigation:** Maps patient symptoms to clinical departments and generates precise floor/room navigation tokens (e.g., Room 204, OPD Cabinet 2).
- 🩺 **Real-Time Doctor Dashboard Sync:** Synchronizes incoming patient transcripts, AI-generated clinical triage insights, and department tokens live via Supabase PostgreSQL.
- 📝 **Voice-Driven E-Prescriptions:** Enables doctors to dictate prescriptions and push structured receipts instantly.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | Next.js 14 (App Router), React 18, Tailwind CSS, Lucide Icons |
| **Voice & Audio DSP** | Web Speech API, Web Audio API (High-Pass/Low-Pass Filters) |
| **AI Inference** | Groq API (Llama 3.3 70B), Google Gemini 1.5 Flash, OpenAI GPT-4o-mini |
| **Backend & Database** | Next.js Serverless Route Handlers, Supabase (PostgreSQL), Google OAuth 2.0 |
| **Deployment** | Vercel Edge Network |

---

## 🚀 Local Setup & Development Guide

### 1. Clone the repository
```bash
git clone https://github.com/ayush17-AI/MEDICOBOT.git
cd MEDICOBOT
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env.local` file in the project root:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
GEMINI_API_KEY=AIzaSy_your_gemini_api_key_here
OPENAI_API_KEY=sk-proj-your_openai_api_key_here
```

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to launch the MEDICOBOT Kiosk interface.

---

## 📜 License
Distributed under the MIT License.
