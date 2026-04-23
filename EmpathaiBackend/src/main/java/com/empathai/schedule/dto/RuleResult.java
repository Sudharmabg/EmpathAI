package com.empathai.schedule.dto;

import lombok.Builder;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
public class RuleResult {
    @Builder.Default
    private List<String> errors = new ArrayList<>();   // hard blocks

    @Builder.Default
    private List<String> warnings = new ArrayList<>(); // soft warnings

    public boolean hasErrors() {
        return errors != null && !errors.isEmpty();
    }
}
