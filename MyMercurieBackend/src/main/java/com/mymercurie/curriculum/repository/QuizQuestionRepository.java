package com.mymercurie.curriculum.repository;

import com.mymercurie.curriculum.entity.QuizQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {
    List<QuizQuestion> findBySubTopicIdOrderByIdAsc(Long subTopicId);
}