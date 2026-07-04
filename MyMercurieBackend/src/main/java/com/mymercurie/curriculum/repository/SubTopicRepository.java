package com.mymercurie.curriculum.repository;

import com.mymercurie.curriculum.entity.SubTopic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SubTopicRepository extends JpaRepository<SubTopic, Long> {
    List<SubTopic> findByModuleIdOrderByOrderIndexAscIdAsc(Long moduleId);
}