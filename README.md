# 🏥 MEDICOBOT — AI-Powered Hospital OPD Voice Triage Kiosk & Doctor Sync Engine

> An intelligent, multilingual voice triage system engineered for high-noise hospital environments. Automates patient registration, symptom analysis, department routing, room navigation token generation, and real-time synchronization with the Doctor Dashboard.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://medicobot-zeta.vercel.app/)
[![Framework](https://img.shields.io/badge/Next.js-14-blue?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Database-Supabase-emerald?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Primary AI Engine](https://img.shields.io/badge/AI%20Engine-Groq%20Llama%203.3-orange?style=for-the-badge)](https://groq.com/)

---

## 🌐 Live Application
- **Production Deployment:** [https://medicobot-zeta.vercel.app/](https://medicobot-zeta.vercel.app/)
- **Target Deployment Target:** Hospital OPD Kiosks & Clinical Workstations

---

## ⚡ Key System Capabilities

### 1. Noise-Resilient Web Audio DSP Processing
Integrated Web Audio API High-Pass and Band-Pass digital signal processing (DSP) filters to eliminate ambient hospital chatter, high-decibel background noise, and echo before processing Speech-to-Text (STT).

### 2. Multi-Provider Resilient AI Fallback Engine
To prevent downtime in critical medical triage workflows, the system implements automated failover:
- **Primary:** **Groq Cloud API (`llama-3.3-70b-versatile`)** for sub-second, low-latency clinical triage analysis.
- **Secondary Failover:** **Google Gemini 1.5 Flash** for deep multimodal backup.
- **Tertiary Failover:** **OpenAI GPT-4o-mini** for high-volume availability guarantees.

### 3. Automated Department Allocation & Room Tokens
Parses unstructured patient speech in multiple regional languages to map reported symptoms to medical specialties (e.g., Cardiology, ENT, General Medicine) and generates instant room/cabinet navigation tokens.

### 4. Real-Time Sync & Voice-Enabled E-Prescriptions
Uses Supabase PostgreSQL WebSockets to push patient transcripts directly to the Doctor Dashboard in real time. Doctors can dictate prescriptions via integrated Speech-to-Text for instant digital storage.

---

## 🛠️ Architecture & Technology Stack

| Domain | Technology |
| :--- | :--- |
| **Frontend Framework** | Next.js 14 (App Router), React 18, Tailwind CSS, Lucide Icons |
| **Speech & Audio DSP** | Web Speech API, Web Audio API DSP Noise Filters |
| **LLM Inference** | Groq Cloud API, Google Gemini API, OpenAI API |
| **Backend Infrastructure** | Next.js Serverless Route Handlers, Supabase (PostgreSQL), Google OAuth 2.0 |
| **Edge Deployment** | Vercel Global Edge Network |

---

## 📂 Project Repository Structure

```
.
├── app/
│   ├── api/             # Serverless Route Handlers for Groq, Gemini & Supabase
│   ├── dashboard/       # Real-time Doctor Consultation Portal
│   ├── kiosk/           # Multilingual Voice Triage Interface for Patients
│   └── page.tsx         # Primary Landing Page
├── components/          # Modular UI Engine & Audio Processing Utilities
├── lib/                 # Supabase Client, AI Fallback Handlers & DSP Filters
└── public/              # Static Assets & Navigation Graphics
```

---

## 🔒 Security & Medical Data Governance
- Zero persistent logging of raw biometric audio recordings.
- API Key encapsulation behind Next.js Serverless Route Handlers (`.env` files ignored from Git VCS).
- Role-based clinical workflow separation between Patient Kiosk and Physician Portal.
