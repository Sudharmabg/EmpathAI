package com.mymercurie.chat.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
public class ChatProxyController {

    private final WebClient webClient;

    public ChatProxyController(
            WebClient.Builder webClientBuilder,
            @org.springframework.beans.factory.annotation.Value("${chatbot.ai-service.url:http://localhost:8000}") String aiServiceUrl,
            @org.springframework.beans.factory.annotation.Value("${chatbot.ai-service.api-key:mymercurie-internal-key-2026}") String internalApiKey) {
        this.webClient = webClientBuilder.baseUrl(aiServiceUrl)
                .defaultHeader("X-Internal-Token", internalApiKey)
                .build();
    }

    @PostMapping("/api/chat/chat")
    public Mono<String> chat(
            @RequestBody String body,
            @RequestHeader(value = "X-Request-ID", required = false) String requestId) {
        String reqId = getOrGenerateRequestId(requestId);
        return webClient.post()
                .uri("/chat")
                .header("X-Request-ID", reqId)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class);
    }

    @PostMapping(value = "/api/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> chatStream(
            @RequestBody String body,
            @RequestHeader(value = "X-Request-ID", required = false) String requestId) {
        String reqId = getOrGenerateRequestId(requestId);
        return webClient.post()
                .uri("/chat/stream")
                .header("X-Request-ID", reqId)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(String.class);
    }

    @PostMapping("/api/agent/chat")
    public Mono<String> agentChat(
            @RequestBody String body,
            @RequestHeader(value = "X-Request-ID", required = false) String requestId) {
        String reqId = getOrGenerateRequestId(requestId);
        return webClient.post()
                .uri("/agent")
                .header("X-Request-ID", reqId)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class);
    }

    private String getOrGenerateRequestId(String headerValue) {
        if (headerValue != null && !headerValue.isBlank()) {
            return headerValue;
        }
        String mdcValue = org.slf4j.MDC.get("requestId");
        if (mdcValue != null && !mdcValue.isBlank()) {
            return mdcValue;
        }
        return java.util.UUID.randomUUID().toString();
    }
}