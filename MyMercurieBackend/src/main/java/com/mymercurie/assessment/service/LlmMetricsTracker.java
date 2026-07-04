package com.mymercurie.assessment.service;

import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicLong;

@Component
public class LlmMetricsTracker {

    private final AtomicLong successCount = new AtomicLong(0);
    private final AtomicLong failureCount = new AtomicLong(0);
    private final AtomicLong totalDurationMs = new AtomicLong(0);

    public void recordSuccess(long durationMs) {
        successCount.incrementAndGet();
        totalDurationMs.addAndGet(durationMs);
    }

    public void recordFailure(long durationMs) {
        failureCount.incrementAndGet();
        totalDurationMs.addAndGet(durationMs);
    }

    public long getSuccessCount() {
        return successCount.get();
    }

    public long getFailureCount() {
        return failureCount.get();
    }

    public long getTotalCalls() {
        return successCount.get() + failureCount.get();
    }

    public double getAverageLatencyMs() {
        long total = getTotalCalls();
        return total == 0 ? 0.0 : (double) totalDurationMs.get() / total;
    }
}
