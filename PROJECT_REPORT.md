# FortiVoice AI — Project Report

**Project Title**: FortiVoice AI — Autonomous AI Sales Voice Agent  
**Candidate Evaluation**: Technical Placement Evaluation  
**Target Organization**: Fortivex AI Private Limited  
**Fictional Enterprise Sourced**: NovaTech Solutions  
**Date**: November 2026  

---

### 1. Project Title & Objective
**FortiVoice AI** is an autonomous, conversational sales engineering voice agent designed to execute end-to-end B2B sales development representative (SDR) workflows. The primary objective is to automate inbound customer qualification, provide factual company and pricing answers via RAG grounding, score leads transparently, and autonomously secure confirmed calendar consultations.

### 2. Business Problem
Traditional enterprise sales qualification faces substantial friction:
- **Delayed Response Times**: Leads waiting hours for an SDR reach out experience a 391% drop in conversion likelihood.
- **Inconsistent Qualification**: Human agents often miss core BANT (Budget, Authority, Need, Timeline) discovery questions.
- **High Repetitive Overhead**: Up to 65% of SDR time is spent on scheduling logistics and basic FAQ answering.
- **Multilingual Support Gaps**: Supporting vernacular languages (e.g. Telugu) typically requires high staffing overhead.

### 3. Proposed Solution
An autonomous voice agent capable of sub-second multi-turn voice interaction that:
1. Greets prospects naturally in English or Telugu.
2. Answers product, SLA, and pricing questions strictly grounded in verifiable RAG documentation.
3. Systematically extracts customer attributes (budget, company, timeline).
4. Calculates real-time lead score (0-100) and temperature (Hot/Warm/Cold).
5. Secures confirmed calendar appointments with automated collision prevention.
6. Writes comprehensive call summaries directly to the CRM.

### 4. Technologies Used
- **Frontend**: React 18, Vite, Tailwind CSS v4, Lucide React, Axios, React Router v6.
- **Backend**: Node.js, Express.js, CORS, Express Rate Limit.
- **Data Persistence**: SQLite3 (`better-sqlite3` with Write-Ahead Logging for high concurrent read throughput).
- **Voice / Speech**: Web Speech API (`SpeechRecognition`), Web SpeechSynthesis API.
- **AI & RAG**: OpenAI API (`gpt-4o-mini`), custom BM25 keyword-frequency chunk retrieval engine.

### 5. Features Implemented
- [x] Full-duplex voice & text interaction with state tracking (`Listening`, `Thinking`, `Speaking`).
- [x] English and Telugu bilingual voice support with localized fallback.
- [x] Dual-mode execution: Live OpenAI LLM mode and 100% reliable smart scripted Demo Mode.
- [x] RAG knowledge base CRUD + interactive semantic retrieval testbench.
- [x] Explainable BANT lead qualification engine (Budget 30, Timeline 25, Authority 20, Need 25).
- [x] Real-time appointment booking with slot collision detection and unique ID generation.
- [x] Complete CRM with search, temperature filters, dossier inspect, and call summary logging.
- [x] Dashboard analytics tracking total calls, qualified pipeline, appointments, and conversion rate.

### 6. System Architecture
```
[Customer (Voice/Text)]
         │ (Web Speech API / Audio Stream / WebSocket)
         ▼
[React 18 Frontend (Vite + Tailwind)]
         │ (REST API / JSON payload)
         ▼
[Express.js Gateway / Rate Limiter]
         │
         ├──► [RAG Knowledge Base Engine (SQLite / Semantic Search)]
         ├──► [OpenAI LLM Engine / Smart Demo Dialog Responder]
         ├──► [BANT Qualification Engine (Scoring / Sentiment)]
         └──► [SQLite Database (WAL Mode: Leads, Appointments, Call Logs)]
```

### 7. Security Considerations
- **API Key Confidentiality**: All LLM and external secrets are sequestered on the backend; no sensitive keys are bundled into frontend assets.
- **SQL Injection Prevention**: All database operations utilize strictly parameterized prepared statements.
- **API Rate Limiting**: Express middleware enforces per-IP sliding window request throttling (120 req/min).
- **Safe Error Responses**: Internal stack traces are suppressed in API error payloads to prevent server fingerprinting.

### 8. Scalability Strategy for 100,000 Users *(Proposed Architecture)*
*Note: The following represents a high-scale production blueprint, not a load-tested result for this local prototype.*
1. **Stateless Web Tier**: Containerize Express backends (Docker/Kubernetes EKS) behind an AWS Application Load Balancer with auto-scaling based on CPU/concurrency.
2. **Distributed Cache**: Introduce Redis clusters for session state, RAG query caching, and distributed rate limiting.
3. **Database Scaling**: Migrate from single-node SQLite to AWS Aurora PostgreSQL Serverless with read-replicas, connection pooling (PgBouncer), and partitioned tables for call logs.
4. **Vector Search Engine**: Replace lightweight token matching with dedicated vector embeddings (Pinecone, Qdrant, or pgvector with HNSW index) for sub-50ms RAG retrieval across millions of enterprise documents.
5. **Asynchronous Processing**: Offload post-call audio transcription, sentiment embedding, and CRM webhook dispatch to background message queues (Kafka or AWS SQS + BullMQ workers).

### 9. Estimated Operational Costs & Assumptions *(100,000 MAU)*
- **LLM Token Costs**: Assuming 100k calls/month, avg 8 turns/call (~4,000 input tokens, ~800 output tokens on `gpt-4o-mini` @ $0.15/1M input, $0.60/1M output): ~$1,080/month.
- **Cloud Infrastructure (Compute & EKS)**: 4x c6g.xlarge instances on AWS: ~$450/month.
- **Database & Cache (Aurora Serverless + ElastiCache Redis)**: ~$380/month.
- **Vector DB / Storage (Qdrant Cloud / S3)**: ~$150/month.
- **Total Estimated Run Cost**: **~$2,060/month** (~$0.02 per qualified lead generated).

### 10. Future Improvements
- WebRTC streaming integration for true full-duplex conversational barge-in.
- Direct bidirectional webhooks for Salesforce, HubSpot, and Zoho CRM syncing.
- Voice cloning support using ElevenLabs or Azure Neural Custom Voice.
- Multi-tenant workspace isolation for B2B SaaS deployments.
