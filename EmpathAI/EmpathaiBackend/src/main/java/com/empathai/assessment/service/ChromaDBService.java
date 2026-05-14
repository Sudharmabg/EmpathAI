package com.empathai.assessment.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.*;
import java.util.LinkedHashMap;

@Slf4j
@Service
public class ChromaDBService {

    @Value("${chromadb.url}")
    private String chromaDbUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String COLLECTION = "psychologist_overviews";

    private static final String STUDENT_PROFILES_COLLECTION = "student_assessment_profiles";


    public void upsertDocument(String docId, String document, Map<String, String> metadata) {
        try {
            // Ensure collection exists first
            ensureCollection(STUDENT_PROFILES_COLLECTION);

            String url = chromaDbUrl + "/api/v1/collections/" + STUDENT_PROFILES_COLLECTION + "/upsert";

            Map<String, Object> body = new HashMap<>();
            body.put("ids",       List.of(docId));
            body.put("documents", List.of(document));
            body.put("metadatas", List.of(metadata != null ? metadata : Map.of()));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            restTemplate.postForEntity(url, new HttpEntity<>(body, headers), Map.class);
            log.info("ChromaDB upsert OK for docId={}", docId);
        } catch (Exception e) {
            log.error("ChromaDB upsert failed for docId={}: {}", docId, e.getMessage());
            throw new RuntimeException("ChromaDB upsert failed", e);
        }
    }


    public List<Map<String, Object>> searchStudentProfiles(
            String queryText, int topN, Map<String, Object> whereFilter) {
        try {
            String url = chromaDbUrl + "/api/v1/collections/" + STUDENT_PROFILES_COLLECTION + "/query";

            Map<String, Object> body = new HashMap<>();
            body.put("query_texts", List.of(queryText));
            body.put("n_results", topN);
            body.put("include", List.of("metadatas", "documents", "distances"));
            if (whereFilter != null && !whereFilter.isEmpty()) {
                body.put("where", whereFilter);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    url, new HttpEntity<>(body, headers), Map.class);

            List<Map<String, Object>> results = new ArrayList<>();
            if (response.getBody() != null) {
                List<List<Map<String, Object>>> metadatas =
                        (List<List<Map<String, Object>>>) response.getBody().get("metadatas");
                List<List<String>> documents =
                        (List<List<String>>) response.getBody().get("documents");
                List<List<Double>> distances =
                        (List<List<Double>>) response.getBody().get("distances");

                if (metadatas != null && !metadatas.isEmpty()) {
                    List<Map<String, Object>> metas = metadatas.get(0);
                    List<String> docs = documents != null && !documents.isEmpty()
                            ? documents.get(0) : List.of();
                    List<Double> dists = distances != null && !distances.isEmpty()
                            ? distances.get(0) : List.of();

                    for (int i = 0; i < metas.size(); i++) {
                        Map<String, Object> entry = new LinkedHashMap<>(metas.get(i));
                        if (i < docs.size())  entry.put("document", docs.get(i));
                        if (i < dists.size()) entry.put("distance", dists.get(i));
                        results.add(entry);
                    }
                }
            }
            log.info("ChromaDB profile search returned {} results for query='{}'", results.size(), queryText);
            return results;
        } catch (Exception e) {
            log.error("ChromaDB profile search failed: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    private void ensureCollection(String collectionName) {
        try {
            String url = chromaDbUrl + "/api/v1/collections";
            Map<String, Object> body = Map.of("name", collectionName);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            restTemplate.postForEntity(url, new HttpEntity<>(body, headers), Map.class);
        } catch (Exception e) {
            // Collection likely already exists — safe to ignore 409 conflicts
            log.debug("ensureCollection {}: {}", collectionName, e.getMessage());
        }
    }

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