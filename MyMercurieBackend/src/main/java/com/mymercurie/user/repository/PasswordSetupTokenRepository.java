package com.mymercurie.user.repository;

import com.mymercurie.user.entity.PasswordSetupToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface PasswordSetupTokenRepository extends JpaRepository<PasswordSetupToken, Long> {
    Optional<PasswordSetupToken> findByToken(String token);
    @Transactional
    void deleteByUserId(Long userId);
}