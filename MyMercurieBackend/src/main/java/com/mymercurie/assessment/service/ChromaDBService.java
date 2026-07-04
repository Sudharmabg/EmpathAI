package com.mymercurie.assessment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChromaDBService {

    @Value("${chromadb.url}")
    private String chromaDbUrl;

    private final RestTemplate restTemplate;
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
    public List<Map<String, Object>> searchStudentProfiles(String query, int topN, Map<String, Object> whereFilter) {
        try {
            String url = chromaDbUrl + "/api/v1/collections/" + COLLECTION + "/query";

            Map<String, Object> body = new HashMap<>();
            body.put("query_texts", List.of(query));
            body.put("n_results", topN);
            if (whereFilter != null && !whereFilter.isEmpty()) {
                body.put("where", whereFilter);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    url, new HttpEntity<>(body, headers), Map.class
            );

            List<Map<String, Object>> results = new ArrayList<>();
            if (response.getBody() != null) {
                List<List<String>> documents = (List<List<String>>) response.getBody().get("documents");
                List<List<Map<String, Object>>> metadatas = (List<List<Map<String, Object>>>) response.getBody().get("metadatas");
                List<List<Double>> distances = (List<List<Double>>) response.getBody().get("distances");

                if (documents != null && !documents.isEmpty()) {
                    List<String> docs = documents.get(0);
                    for (int i = 0; i < docs.size(); i++) {
                        Map<String, Object> item = new HashMap<>();
                        item.put("document", docs.get(i));
                        if (metadatas != null && !metadatas.isEmpty()) item.put("metadata", metadatas.get(0).get(i));
                        if (distances != null && !distances.isEmpty()) item.put("distance", distances.get(0).get(i));
                        results.add(item);
                    }
                }
            }

            log.info("searchStudentProfiles returned {} results", results.size());
            return results;

        } catch (Exception e) {
            log.error("searchStudentProfiles failed: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }
    public void upsertDocument(String docId, String document, Map<String, String> metadata) {
        try {
            String url = chromaDbUrl + "/api/v1/collections/" + COLLECTION + "/upsert";

            Map<String, Object> body = new HashMap<>();
            body.put("ids",       List.of(docId));
            body.put("documents", List.of(document));
            body.put("metadatas", List.of(metadata));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            restTemplate.postForEntity(url, new HttpEntity<>(body, headers), Map.class);
            log.info("ChromaDB upsert success for docId={}", docId);

        } catch (Exception e) {
            log.error("ChromaDB upsert failed for docId={}: {}", docId, e.getMessage(), e);
            throw e;
        }
    }
}