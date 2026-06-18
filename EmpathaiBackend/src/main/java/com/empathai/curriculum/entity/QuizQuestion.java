package com.empathai.curriculum.entity;

import com.empathai.user.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.*;

@Entity
@Table(name = "quiz_questions")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
public class QuizQuestion extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "subtopic_id", nullable = false)
    @JsonBackReference("subtopic-quiz")
    private SubTopic subTopic;

    @ManyToOne
    @JoinColumn(name = "module_id")
    private Module module;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "option_a", nullable = false)
    private String optionA;

    @Column(name = "option_b", nullable = false)
    private String optionB;

    @Column(name = "option_c")
    private String optionC;

    @Column(name = "option_d")
    private String optionD;

    @Column(name = "correct_answer", nullable = false)
    private Integer correctAnswer;

    @Column(name = "correct_answer_index")
    private Integer correctAnswerIndex;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Lob
    @Column(name = "question_image")
    @JsonIgnore
    private byte[] questionImage;

    @Column(name = "question_image_type")
    private String questionImageType;

}
