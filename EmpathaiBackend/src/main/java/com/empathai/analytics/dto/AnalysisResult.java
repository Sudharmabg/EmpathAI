package com.empathai.analytics.dto;

import lombok.*;
import java.util.List;

@Data
@AllArgsConstructor
public class AnalysisResult {
    private List<String> strengths;
    private List<String> AreastoFocus;
}