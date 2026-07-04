package com.mymercurie.user.controller;

import com.mymercurie.user.entity.SchoolClass;
import com.mymercurie.user.repository.SchoolClassRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/classes")
@RequiredArgsConstructor
public class SchoolClassController {

    private static final Logger logger = LoggerFactory.getLogger(SchoolClassController.class);

    private final SchoolClassRepository schoolClassRepository;

    @GetMapping
    public ResponseEntity<List<SchoolClass>> getAllClasses() {
        logger.info("getAllClasses started");
        try {
            ResponseEntity<List<SchoolClass>> response = ResponseEntity.ok(schoolClassRepository.findAll());
            logger.info("getAllClasses completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("getAllClasses failed: {}", e.getMessage(), e);
            throw e;
        }
    }
}