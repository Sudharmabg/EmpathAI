package com.empathai.user.service;

import com.empathai.user.entity.PasswordSetupToken;
import com.empathai.user.entity.User;
import com.empathai.user.repository.PasswordSetupTokenRepository;
import com.resend.Resend;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    // ✅ FIXED: Removed "private final EmailService emailService" — was causing
    //           a circular dependency (EmailService injecting itself).
    //           Also removed the duplicate "import java.util.UUID" that was above the class.

    private final PasswordSetupTokenRepository tokenRepository;

    @Value("${resend.api-key}")
    private String resendApiKey;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${app.invite.token-expiry-hours:48}")
    private int tokenExpiryHours;

    public void sendPasswordSetupEmail(User user) {
        // 1. Delete any old token for this user (handles resend invite case)
        tokenRepository.deleteByUserId(user.getId());

        // 2. Generate a new secure random token
        String token = UUID.randomUUID().toString();

        // 3. Save token to DB with expiry timestamp
        PasswordSetupToken setupToken = PasswordSetupToken.builder()
                .token(token)
                .user(user)
                .expiresAt(LocalDateTime.now().plusHours(tokenExpiryHours))
                .used(false)
                .build();
        tokenRepository.save(setupToken);

        // 4. Build the password setup link
        String setupLink = frontendUrl + "/set-password?token=" + token;

        // 5. Send email via Resend API
        Resend resend = new Resend(resendApiKey);

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from("EmpathAI <onboarding@resend.dev>")// replace with your verified Resend domain
                .to(user.getEmail())
                .subject("Set Up Your EmpathAI Password")
                .html(buildEmailHtml(user.getName(), setupLink))
                .build();

        try {
            CreateEmailResponse response = resend.emails().send(params);
            log.info("Password setup email sent to {} | Resend ID: {}", user.getEmail(), response.getId());
        } catch (Exception e) {
            log.error("Failed to send password setup email to {}: {}", user.getEmail(), e.getMessage());
            // Do NOT throw — student is already created in DB.
            // Admin can trigger a resend later if needed.
        }
    }

    private String buildEmailHtml(String name, String setupLink) {
        return """
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 30px;">
              <div style="max-width: 500px; margin: auto; background: white;
                          border-radius: 10px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h2 style="color: #7c3aed;">Welcome to EmpathAI! 👋</h2>
                <p>Hi <strong>%s</strong>,</p>
                <p>Your student account has been created. Please click the button below
                   to set up your password and access the portal.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="%s"
                     style="background: #7c3aed; color: white; padding: 14px 28px;
                            border-radius: 8px; text-decoration: none; font-size: 16px;">
                    Set Up My Password
                  </a>
                </div>
                <p style="color: #888; font-size: 13px;">
                  This link expires in 48 hours. If you did not expect this email, please ignore it.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #aaa; font-size: 12px; text-align: center;">
                  EmpathAI — Student Wellness Platform
                </p>
              </div>
            </body>
            </html>
            """.formatted(name, setupLink);
    }
}
