package com.mymercurie.assessment.repository;

import com.mymercurie.assessment.entity.AnswerOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface AnswerOptionRepository extends JpaRepository<AnswerOption, Long> {

    List<AnswerOption> findByQuestionId(Long questionId);

    List<AnswerOption> findByQuestionIdIn(List<Long> questionIds);

    Optional<AnswerOption> findByQuestionIdAndOptionLabel(Long questionId, String optionLabel);

    Optional<AnswerOption> findByQuestionIdAndOptionIndex(Long questionId, Integer optionIndex);

    @Query("SELECT ao FROM AnswerOption ao WHERE ao.questionId = :qid AND ao.cachedBullets IS NULL")
    List<AnswerOption> findUncachedByQuestionId(@Param("qid") Long questionId);

    @Query("SELECT ao FROM AnswerOption ao WHERE ao.cachedBullets IS NULL")
    List<AnswerOption> findAllUncached();

    @Modifying
    @Transactional
    void deleteByQuestionId(Long questionId);

    @Modifying
    @Transactional
    @Query("UPDATE AnswerOption ao SET ao.cachedBullets = NULL, ao.bulletsGeneratedAt = NULL WHERE ao.questionId = :qid")
    void invalidateCacheForQuestion(@Param("qid") Long questionId);
}