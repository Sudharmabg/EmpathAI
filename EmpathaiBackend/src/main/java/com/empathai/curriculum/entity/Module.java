package com.empathai.curriculum.entity;

import com.empathai.user.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.*;
import java.util.List;

@Entity
@Table(name = "modules")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
public class Module extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "syllabus_id", nullable = false)
    @JsonBackReference
    private Syllabus syllabus;

    @Column(nullable = false)
    private String title;

    @OneToMany(mappedBy = "module", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("order_index ASC, id ASC")
    @JsonManagedReference("module-subtopic")
    private List<SubTopic> subTopics;

}
