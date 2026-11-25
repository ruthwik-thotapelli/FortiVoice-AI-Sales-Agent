# System Architecture & Technical Specifications

## 1. System Overview
FortiVoice AI implements a 4-tier decoupled architecture:
1. **Presentation Tier (React Vite SPA)**: Handles real-time voice capture, audio rendering, conversational state visualization, and CRM management.
2. **API & Security Gateway (Express.js)**: Enforces IP rate limiting, CORS filtering, payload validation, and route dispatching.
3. **Intelligence & Qualification Tier**: Integrates Retrieval-Augmented Generation (RAG), OpenAI API / smart demo dialogue responder, BANT qualification algorithm, and slot collision detector.
4. **Data Persistence Tier (SQLite WAL)**: Provides sub-millisecond atomic storage with Write-Ahead Logging for high concurrency.

---

## 2. Speech-to-Text & Text-to-Speech Flow

```
[User Mic] ──► [Web Speech API (STT)] ──► [Interim/Final Text]
                                                    │
                                                    ▼
[Speaker Output] ◄── [SpeechSynthesis] ◄── [Backend API Response]
```

- **Speech Recognition**: Uses browser-native `webkitSpeechRecognition` with language toggling (`en-US` and `te-IN`). Interim transcripts display real-time feedback with zero external cloud latency.
- **Speech Synthesis**: Converts generated text into audio utterances with conversational rate (`1.0x`) and pitch tuning.
- **Graceful Degradation**: If browser microphone permissions are blocked or unsupported, the interface automatically presents a responsive text input bar, preserving 100% feature availability.

---

## 3. RAG Retrieval Mechanism

1. **Query Ingestion**: Customer query is sanitized and tokenized.
2. **Multi-Field Matching**:
   - `Title Match`: Weight +8
   - `Keyword Tag Match`: Weight +6
   - `Category Match`: Weight +4
   - `Content Body Frequency`: Weight +2 per token occurrence (capped at 8)
3. **Context Injection**: Top 3 matching articles are retrieved and supplied as ground truth to the LLM system prompt:
   ```text
   COMPANY KNOWLEDGE BASE (Use this as absolute ground truth. NEVER invent pricing or features outside this context):
   [Category - Title]: Content
   ```
4. **Zero-Hallucination Guardrail**: The system prompt strictly prohibits fabricating pricing tiers, features, or appointment approvals not present in the retrieved chunks.

---

## 4. Lead Qualification Engine (BANT Framework)

The scoring algorithm calculates a composite score between 0 and 100:

$$\text{Lead Score} = \text{Budget (Max 30)} + \text{Timeline (Max 25)} + \text{Authority (Max 20)} + \text{Need (Max 25)}$$

- **Hot Lead ($\ge 75$)**: Immediate purchase urgency, verified enterprise budget ($5k+/mo), full contact details captured.
- **Warm Lead ($50 - 74$)**: Active quarter timeline, moderate budget ($2k-$4k/mo), qualified product interest.
- **Cold Lead ($< 50$)**: Exploratory timeline (6+ months), unallocated or starter budget, incomplete contact info.

---

## 5. Security Controls

| Category | Protection Mechanism |
|---|---|
| **SQL Injection** | Prepared statements with parameterized bindings via `better-sqlite3`. No dynamic string concatenation. |
| **API Denial of Service** | Sliding window rate limiting (120 requests/min per IP address). |
| **Credential Safety** | LLM API keys are isolated to backend `.env` and never bundled or sent to the client browser. |
| **Payload Sanitization** | JSON body parsing limited to 1MB max payload; strictly validated parameters on all mutation endpoints. |

---

## 6. Cloud Deployment Architecture (Production Scale)

To scale FortiVoice AI to high-volume production deployments:

1. **Containerization**: Package backend and frontend into multi-stage Docker images.
2. **Container Orchestration**: Deploy on AWS Elastic Kubernetes Service (EKS) or Google Cloud Run with Horizontal Pod Autoscaler (HPA) configured on incoming request count.
3. **Database Migration**: Migrate SQLite to Amazon Aurora PostgreSQL Serverless v2 with multi-AZ replication.
4. **Vector Search**: Transition BM25 keyword matching to pgvector with HNSW index or dedicated Pinecone vector clusters.
5. **CDN & Edge Acceleration**: Serve Vite frontend build assets via AWS CloudFront / Cloudflare Edge CDN with gzip/brotli compression.
