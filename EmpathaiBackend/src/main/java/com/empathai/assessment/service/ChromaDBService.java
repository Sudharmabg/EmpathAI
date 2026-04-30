package com.empathai.assessment.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@Slf4j
@Service
public class ChromaDBService {

    @Value("${chromadb.url}")
    private String chromaDbUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String COLLECTION = "psychologist_overviews";

    public List<String> getRelevantOverviews(String studentAnswersText, int topN) {
        try {
            String url = chromaDbUrl + "/api/v1/collections/" + COLLECTION + "/query";

            Map<String, Object> body = new HashMap<>();
            body.put("query_texts", List.of(studentAnswersText));
            body.put("n_results", topN);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    url, new HttpEntity<>(body, headers), Map.class
            );

            List<String> overviews = new ArrayList<>();
            if (response.getBody() != null) {
                List<List<String>> documents = (List<List<String>>) response.getBody().get("documents");
                if (documents != null && !documents.isEmpty()) {
                    overviews.addAll(documents.get(0));
                }
            }

            log.info("ChromaDB returned {} overviews", overviews.size());
            return overviews;

        } catch (Exception e) {
            log.error("ChromaDB query failed: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }
}