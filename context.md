# EmpathAI Workspace Context

This document maintains references to key codebase files for future reference.

## Feelings Explorer

- **Assessment Questionnaire UI Component:** [Questionnaire.jsx](file:///c:/empathai_updated_new/EmpathAI/EmpathaiFrontend/src/components/studentdashboard/assessment/Questionnaire.jsx)
- **Admin Panel UI Component:** [AssessmentManagement.jsx](file:///c:/empathai_updated_new/EmpathAI/EmpathaiFrontend/src/components/admin/feelingsexplorer/AssessmentManagement.jsx)

## Schedule Planner

- **Student Dashboard UI Component:** [Schedule.jsx](file:///c:/empathai_updated_new/EmpathAI/EmpathaiFrontend/src/components/studentdashboard/schedule/Schedule.jsx)
- **Admin Panel UI Component:** [SchedulePlanner.jsx](file:///c:/empathai_updated_new/EmpathAI/EmpathaiFrontend/src/components/admin/SchedulePlanner.jsx)
- **API Service:** [scheduleApi.js](file:///c:/empathai_updated_new/EmpathAI/EmpathaiFrontend/src/api/scheduleApi.js)

## ChatBuddy

- **Student Dashboard UI Component:** [ChatBuddy.jsx](file:///c:/empathai_updated_new/EmpathAI/EmpathaiFrontend/src/components/studentdashboard/chatbuddy/ChatBuddy.jsx)
- **API Client Service:** [chatService.js](file:///c:/empathai_updated_new/EmpathAI/EmpathaiFrontend/src/services/chatService.js)
- **Backend API Controller:** [ChatController.java](file:///c:/empathai_updated_new/EmpathAI/EmpathaiBackend/src/main/java/com/empathai/chat/controller/ChatController.java)
- **Backend Context Enricher & Orchestrator:** [ChatService.java](file:///c:/empathai_updated_new/EmpathAI/EmpathaiBackend/src/main/java/com/empathai/chat/service/ChatService.java)
- **LangGraph Routing Pipeline:** [pipeline.py](file:///c:/empathai_updated_new/EmpathAI/EmpathaiAI/graph/pipeline.py)
- **Fast Path Classifier (AI Routing Node):** [fast_path_classifier.py](file:///c:/empathai_updated_new/EmpathAI/EmpathaiAI/graph/nodes/fast_path_classifier.py) (Routes messages and contains rule-based multilingual and transliterated emotional filters)
- **Crisis Double-Check Evaluator (AI Node):** [crisis_evaluator.py](file:///c:/empathai_updated_new/EmpathAI/EmpathaiAI/graph/nodes/crisis_evaluator.py) (Performs deep LLM validation for safety triggers and returns emergency helpline redirect)
- **Flagged Cases Controller (Backend):** [FlaggedChatController.java](file:///c:/empathai_updated_new/EmpathAI/EmpathaiBackend/src/main/java/com/empathai/chat/controller/FlaggedChatController.java) (Provides REST endpoints for flagged alert management and SUPER_ADMIN psychologist assignment checks)
- **Support Alerts Dashboard (Frontend UI):** [FlaggedChats.jsx](file:///c:/empathai_updated_new/EmpathAI/EmpathaiFrontend/src/components/admin/FlaggedChats.jsx) (Admin panel for transcript reviewing, status toggling, and psychologist assignment)
- **Crisis System Test Suite:** [flag_concern.md](file:///c:/empathai_updated_new/EmpathAI/flag_concern.md) (Documented test cases and checklists for multilingual testing)

### Techniques Used
- **Adaptive LangGraph Routing (Fast/Slow Paths)**: Zero-LLM classifier routes simple curriculum queries straight to response generation. Complex/sensitive/emotional inputs traverse a full classification, scheduling reasoning, and validation pipeline.
- **Multimodal Context Enrichment**: Incoming messages are enriched with student-specific academic state (current schedule tasks, exams, active goals) and emotional context (sleep metrics, 7-day mood history, clinical assessment summaries).
- **PostgreSQL Session Memory Checkpointing**: State graphs map memory directly to student ID thread savers using a persistent PostgreSQL saver (`PostgresSaver`) pool, eliminating client-side context tracking.
- **Crisis & Safety Guardrails**: Real-time moderation detects emotional distress, automatically generating alert flags sent directly to counselor systems via `flaggedChatService`.

## AI Service

- **Main Entry Point:** [main.py](file:///c:/empathai_updated_new/EmpathAI/EmpathaiAI/main.py)
- **Chat Router:** [chat.py](file:///c:/empathai_updated_new/EmpathAI/EmpathaiAI/routers/chat.py)
- **LangGraph Pipeline:** [pipeline.py](file:///c:/empathai_updated_new/EmpathAI/EmpathaiAI/graph/pipeline.py)
- **LLM/OpenAI Service:** [openai_service.py](file:///c:/empathai_updated_new/EmpathAI/EmpathaiAI/services/openai_service.py)
