package com.empathai.user.service;

import com.empathai.rewards.service.RewardsService;
import com.empathai.user.dto.auth.AuthResponse;
import com.empathai.user.dto.auth.LoginRequest;
import com.empathai.user.dto.auth.SetPasswordRequest;
import com.empathai.user.entity.PasswordSetupToken;
import com.empathai.user.entity.Student;
import com.empathai.user.entity.User;
import com.empathai.user.entity.enums.UserRole;
import com.empathai.user.exception.EmpathaiException;
import com.empathai.user.repository.PasswordSetupTokenRepository;
import com.empathai.user.repository.StudentRepository;
import com.empathai.user.repository.UserRepository;
import com.empathai.user.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final PasswordSetupTokenRepository tokenRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final RewardsService rewardsService;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String loginId = request.getEmail();

        User userLookup = userRepository.findByEmail(loginId)
                .or(() -> userRepository.findByUsername(loginId))
                .orElseThrow(() -> new EmpathaiException("Invalid credentials", "AUTH_FAILURE"));

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(userLookup.getEmail(), request.getPassword())
            );
        } catch (AuthenticationException e) {
            throw new EmpathaiException("Invalid credentials", "AUTH_FAILURE");
        }

        // ── Increment loginCount and award badges for students ──────────────
        if (userLookup.getRole() == UserRole.STUDENT) {

            // Atomically increment login count
            studentRepository.incrementLoginCount(userLookup.getId());

            // Reload student to get the updated loginCount
            Student student = studentRepository.findById(userLookup.getId()).orElse(null);

            if (student != null) {
                int newLoginCount = student.getLoginCount() != null
                        ? student.getLoginCount()
                        : 1;

                // Check and award login milestone badges
                try {
                    rewardsService.checkAndAwardLoginBadges(userLookup.getId(), newLoginCount);
                    log.info("Login badge check completed for student {} with {} logins",
                            userLookup.getId(), newLoginCount);
                } catch (Exception e) {
                    // Never let badge logic break the login flow
                    log.warn("Failed to award login badge for student {}: {}",
                            userLookup.getId(), e.getMessage());
                }
            }
        }

        String jwtToken = jwtService.generateToken(userLookup);

        return AuthResponse.builder()
                .token(jwtToken)
                .user(userService.mapToFullResponse(userLookup))
                .build();
    }

    // Called by GET /api/auth/validate-token?token=xxx
    public Map<String, Object> validateSetupToken(String token) {
        PasswordSetupToken setupToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new EmpathaiException("Invalid or expired link", "INVALID_TOKEN"));

        if (setupToken.isUsed()) {
            throw new EmpathaiException("This link has already been used", "TOKEN_USED");
        }
        if (setupToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new EmpathaiException("This link has expired. Please contact your admin.", "TOKEN_EXPIRED");
        }

        return Map.of(
                "valid", true,
                "name", setupToken.getUser().getName(),
                "email", setupToken.getUser().getEmail()
        );
    }

    // Called by POST /api/auth/set-password
    @Transactional
    public void setPassword(SetPasswordRequest request) {
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new EmpathaiException("Passwords do not match", "PASSWORD_MISMATCH");
        }
        if (request.getPassword().length() < 8) {
            throw new EmpathaiException("Password must be at least 8 characters", "WEAK_PASSWORD");
        }

        PasswordSetupToken setupToken = tokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new EmpathaiException("Invalid or expired link", "INVALID_TOKEN"));

        if (setupToken.isUsed()) {
            throw new EmpathaiException("This link has already been used", "TOKEN_USED");
        }
        if (setupToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new EmpathaiException("This link has expired. Please contact your admin.", "TOKEN_EXPIRED");
        }

        User user = setupToken.getUser();
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);

        setupToken.setUsed(true);
        tokenRepository.save(setupToken);
    }
}