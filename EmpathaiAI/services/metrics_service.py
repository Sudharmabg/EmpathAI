# metrics_service.py — Simple tracking for GPT-4o calls

metrics = {
    "llm_calls_success_total": 0,
    "llm_calls_failure_total": 0,
    "llm_calls_total": 0,
    "llm_calls_latency_avg_ms": 0.0,
    "_total_duration_ms": 0.0
}

def record_success(duration_ms: float):
    metrics["llm_calls_success_total"] += 1
    metrics["llm_calls_total"] += 1
    metrics["_total_duration_ms"] += duration_ms
    metrics["llm_calls_latency_avg_ms"] = metrics["_total_duration_ms"] / metrics["llm_calls_total"]

def record_failure(duration_ms: float):
    metrics["llm_calls_failure_total"] += 1
    metrics["llm_calls_total"] += 1
    metrics["_total_duration_ms"] += duration_ms
    metrics["llm_calls_latency_avg_ms"] = metrics["_total_duration_ms"] / metrics["llm_calls_total"]
