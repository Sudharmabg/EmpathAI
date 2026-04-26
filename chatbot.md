# EmpathAI Chatbot — Implementation Status & Improvement Plan

Target audience: Students in Class 8–10 of Indian CBSE schools.
Purpose: Answer academic/curriculum queries and provide emotional support.

---

## ✅ What Is Currently Done

### Python AI Service (`EmpathaiAI/`)

| Component | Status | Notes |
|---|---|---|
| FastAPI app (`main.py`) | ✅ Done | Runs on port `8000`, CORS restricted to Spring Boot |
| `/chat` POST endpoint | ✅ Done | Accepts `student_name`, `grade`, `message`, `history` |
| `/health` GET endpoint | ✅ Done | Returns `{"status": "ok"}` |
| OpenAI `gpt-4o-mini` integration | ✅ Done | `temperature=0.7`, `max_tokens=512` |
| Unified system prompt | ✅ Done | Handles both ACADEMIC and EMOTIONAL modes in one prompt |
| Mode detection via hidden tag | ✅ Done | GPT appends `[MODE:curriculum]` or `[MODE:mental_health]` — stripped before returning to student |
| Markdown + LaTeX formatting | ✅ Done | Inline `$...$` and block `$$...$$` math supported |
| Crisis response | ✅ Done | iCall helpline `9152987821` included in prompt for self-harm signals |
| Pydantic schemas | ✅ Done | `ChatRequest`, `ChatResponse`, `HistoryMessage` validated |

### Spring Boot Gateway (`EmpathaiBackend/`)

| Component | Status | Notes |
|---|---|---|
| `ChatController` | ✅ Done | 4 endpoints: `POST /message`, `GET /sessions`, `GET /session/{id}`, `GET /usage` |
| `ChatService` | ✅ Done | Full orchestration: limit check → session → history → AI call → save → usage increment |
| `ChatSession` entity + repo | ✅ Done | One session per student per week (Mon–Sun), unique constraint enforced |
| `ChatMessage` entity + repo | ✅ Done | Stores role, content, detected_mode, created_at |
| `ChatUsage` entity + repo | ✅ Done | Daily counter with unique constraint on `(student_id, usage_date)` |
| Daily rate limit (20/day) | ✅ Done | Configurable via `app.chat.daily-limit` property |
| Last 10 messages as context | ✅ Done | Fetched from DB, reversed to chronological order before sending to Python |
| JWT auth + `@PreAuthorize("hasRole('STUDENT')")` | ✅ Done | All chat endpoints are student-only |
| Async `WebClient` call to Python | ✅ Done | 5xx errors mapped to `EmpathaiException` |
| Grade resolution from `Student` entity | ✅ Done | Falls back to `"1st Standard"` if `className` is null |

### React Frontend (`EmpathaiFrontend/`)

| Component | Status | Notes |
|---|---|---|
| `chatService.js` | ✅ Done | `sendMessage`, `getSessions`, `getSessionHistory`, `getUsage` wired to Spring Boot |
| `ChatBuddy.jsx` — dual-pane layout | ✅ Done | Main chat window + history sidebar, responsive (stacks on mobile) |
| `ChatBuddy.jsx` — message bubbles + auto-scroll | ✅ Done | User/bot bubbles with timestamps, scrolls to latest message |
| `ChatBuddy.jsx` — quick replies | ✅ Done | 4 preset quick-reply chips |
| `ChatBuddy.jsx` — crisis modal | ✅ Done | Keyword detection (`suicide`, `kill myself`, etc.) triggers full-screen modal with helpline |
| `ChatBuddy.jsx` — history sidebar | ✅ Done | Loads real sessions from `chatService.getSessions()`; click to restore full conversation |
| `ChatBuddy.jsx` — AI integration | ✅ Done | `handleSendMessage` calls `chatService.sendMessage()`; mock `getBotResponse()` removed |
| `ChatBuddy.jsx` — usage counter | ✅ Done | Header shows remaining messages; input disabled + warning when limit reached |
| `ChatBuddy.jsx` — Markdown/LaTeX rendering | ✅ Done | Bot replies rendered via `react-markdown` + `rehype-katex` + `remark-math` |
| `ChatBuddy.jsx` — mode badge | ✅ Done | 📚 Academic / 💚 Emotional Support badge shown under each bot message |
| `ChatBuddy.jsx` — loading/typing state | ✅ Done | Animated 3-dot typing indicator shown while awaiting API response |
| `ChatBuddy.jsx` — crisis helpline | ✅ Fixed | Corrected from placeholder `911-111-1111` to iCall `9152987821` |
| `Chatbot.jsx` | ⚠️ Stub | Re-exports a placeholder component — not used in production flow |

---

## 🚀 Running the Python AI Service

### Prerequisites
- Python 3.10 or higher
- An OpenAI API key set in `EmpathaiAI/.env`

```env
# EmpathaiAI/.env
OPENAI_API_KEY=<your-openai-api-key>
```

### Steps

**1. Open a terminal and navigate to the Python service folder:**
```bash
cd EmpathaiAI
```

**2. Create and activate a virtual environment:**
```bash
# Create
python -m venv venv

# Activate — Windows
venv\Scripts\activate

# Activate — macOS/Linux
source venv/bin/activate
```

**3. Install dependencies:**
```bash
pip install -r requirements.txt
```

**4. Start the server:**
```bash
uvicorn main:app --reload --port 8000
```

The service will be available at `http://localhost:8000`.

### Verify it's running

```bash
curl http://localhost:8000/health
# Expected: {"status": "ok", "service": "EmpathAI AI Service"}
```

Or open `http://localhost:8000/docs` in a browser for the auto-generated Swagger UI where you can test the `/chat` endpoint interactively.

### Test the `/chat` endpoint (Postman / cURL)

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d {
    "student_name": "Aarav",
    "grade": "Class 9",
    "message": "What is photosynthesis?",
    "history": []
  }
```

### Notes
- The service must be running **before** starting Spring Boot, as Spring Boot calls `http://localhost:8000/chat` on every student message.
- `--reload` flag enables hot-reload on code changes — use only in development.
- For production, replace `--reload` with `--workers 2` (or more based on load):
  ```bash
  uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
  ```

---

## 🔧 What Needs to Be Improved

### 1. Hallucination Handling ✅

**Implemented in `openai_service.py`:**
- System prompt now explicitly restricts answers to CBSE Class 8–10 syllabus (Science, Maths, Social Science, English, Hindi)
- Grade constraint is hard — GPT is told not to use concepts from higher classes unless explicitly asked
- Confidence disclaimer added: GPT must say "I'm not 100% sure — please verify with your textbook or teacher" when uncertain
- GPT is instructed never to make up facts, formulas, or historical dates

---

### 2. Caching of Common Questions ✅

**Implemented in `EmpathaiAI/services/cache_service.py`:**
- Semantic cache using `sentence-transformers` (`all-MiniLM-L6-v2`) with cosine similarity threshold `0.92`
- Only curriculum answers are cached; emotional responses are always fresh
- Only standalone questions (no conversation history) are cached to avoid context mismatch
- Cache is in-memory for MVP; migrate to Redis with 7-day TTL for production

---

### 3. Grade-Aware Curriculum Scoping ✅

**Implemented in `openai_service.py` system prompt:**
- Prompt now explicitly states: "Only explain concepts at the level taught in {grade}. Do not use concepts from higher classes unless explicitly asked."
- Grade is passed dynamically from Spring Boot on every request

---

### 4. Emotional Mode Safety Improvements ✅

**Implemented in `ChatService.java`:**
- Crisis keyword pre-filter runs **before** calling Python — if matched, returns a hardcoded empathetic response with iCall `9152987821` immediately, no GPT call made
- Keywords checked: `suicide`, `kill myself`, `end my life`, `don't want to live`, `want to die`, `hurt myself`
- All `mental_health` messages (both crisis and non-crisis) are saved with `flagged = true` in `chat_messages`
- New endpoint `GET /api/chat/flagged` accessible to `PSYCHOLOGIST` and `SCHOOL_ADMIN` roles for review

---

### 5. Context Window — History Improvement ✅

**Implemented in `openai_service.py`:**
- `_trim_history()` iterates history in reverse and accumulates token counts using `tiktoken`
- Stops adding messages once the 2000-token budget is exceeded
- Prevents context window overflow for students who write long messages

---

### 6. Connect ChatBuddy.jsx to the Real API ✅

The UI is well-built but entirely disconnected from the backend. The local `getBotResponse()` mock needs to be replaced with real API calls.

**Changes needed in `ChatBuddy.jsx`:**

- Replace `getBotResponse()` with `chatService.sendMessage(message)` and handle the async response.
- On load, call `chatService.getSessions()` and replace the hardcoded `historyItems` array.
- On load, call `chatService.getUsage()` and display remaining messages in the header.
- Disable the input and show a warning when `remaining === 0`.
- Add a typing indicator (animated dots) while awaiting the API response.
- Store and display `detected_mode` from the API response as a badge (📚 / 💚) on each bot message.

**Render Markdown and LaTeX** — GPT responses use Markdown and LaTeX; plain `whitespace-pre-line` will not render them:

```bash
npm install react-markdown remark-math rehype-katex katex
```

Replace the bot message `<p>` with:
```jsx
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

<ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
  {message.text}
</ReactMarkdown>
```

**Crisis modal fix:** The current modal shows a placeholder number `911-111-1111`. Update it to the correct iCall helpline: `9152987821`.

---

### 7. Error Handling Gaps ✅

| Gap | Status |
|---|---|
| Python service down → generic 500 | Fixed — `try/catch` around WebClient call returns friendly message: *"Our AI assistant is temporarily unavailable. Please try again in a few minutes."* |
| `grade` null → defaults silently | Improved — falls back to `"Class 9"` (more realistic default) |
| No timeout on `WebClient` call | Fixed — `.timeout(Duration.ofSeconds(15))` added |

---

## 📦 Dependency Additions Needed

### Python (`requirements.txt`)
```
sentence-transformers   # for semantic caching
tiktoken                # for token budget trimming
redis                   # for production cache (optional for MVP)
```

### React (`package.json`)
```
react-markdown          # render GPT markdown responses
rehype-katex            # KaTeX rehype plugin
remark-math             # remark math plugin
katex                   # KaTeX peer dependency
```

---

## 🗺️ Revised Build Priority

| Priority | Task |
|---|---|
| 🔴 High | Add crisis keyword pre-filter in Spring Boot ✅ |
| 🔴 High | Add confidence disclaimer + scope restriction to system prompt ✅ |
| 🟡 Medium | Implement semantic cache (in-memory MVP) ✅ |
| 🟡 Medium | Split temperature by mode (0.2 curriculum / 0.7 emotional) ✅ |
| 🟡 Medium | Add WebClient timeout ✅ |
| 🟡 Medium | Flag mental_health messages for psychologist review ✅ |
| 🟢 Low | Token budget trimming for history ✅ |
| 🟢 Low | RAG with NCERT content (long-term hallucination fix) |
| 🟢 Low | Migrate in-memory cache to Redis |
