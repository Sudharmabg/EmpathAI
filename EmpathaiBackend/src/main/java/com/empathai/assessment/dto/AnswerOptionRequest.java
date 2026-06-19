package com.empathai.assessment.dto;

import lombok.*;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnswerOptionRequest {


    private Long questionId;
    private Integer optionIndex;
    private String optionLabel;

    private String range;
    private String overallMeaning;

    private String interpretation;
    private String tag;
}
