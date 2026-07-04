package com.mymercurie.intervention.service;

import com.mymercurie.intervention.dto.InterventionRequest;
import com.mymercurie.intervention.dto.InterventionResponse;
import com.mymercurie.intervention.entity.Intervention;
import com.mymercurie.intervention.repository.InterventionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class InterventionService {

    private final InterventionRepository interventionRepository;

    public InterventionResponse createIntervention(InterventionRequest request) {
        log.info("Creating intervention for studentId: {}", request.getStudentId());
        Intervention intervention = Intervention.builder()
                .studentId(request.getStudentId())
                .type(request.getType())
                .notes(request.getNotes())
                .build();
        
        Intervention saved = interventionRepository.save(intervention);
        return mapToResponse(saved);
    }

    public List<InterventionResponse> getInterventionsByStudentId(Long studentId) {
        return interventionRepository.findByStudentId(studentId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private InterventionResponse mapToResponse(Intervention intervention) {
        return InterventionResponse.builder()
                .id(intervention.getId())
                .studentId(intervention.getStudentId())
                .type(intervention.getType())
                .notes(intervention.getNotes())
                .createdAt(intervention.getCreatedAt())
                .build();
    }
}
