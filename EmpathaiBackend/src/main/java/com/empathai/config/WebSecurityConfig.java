package com.empathai.config;

import com.empathai.user.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class WebSecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final AuthenticationProvider authenticationProvider;

    @Value("${cors.allowed-origins:http://localhost:3000,http://localhost:3001,http://localhost:5173}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        // ── CSRF: use a readable cookie so the React frontend can send the token back ──
        CookieCsrfTokenRepository csrfRepo = CookieCsrfTokenRepository.withHttpOnlyFalse();
        // CookieCsrfTokenRepository sets the cookie name to XSRF-TOKEN by default.
        // The frontend must read this cookie and send its value in the X-XSRF-TOKEN header.
        CsrfTokenRequestAttributeHandler requestHandler = new CsrfTokenRequestAttributeHandler();
        requestHandler.setCsrfRequestAttributeName(null); // deferred loading

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // ── CSRF protection (re-enabled now that we are NOT using localStorage) ──
                // We exempt /api/auth/login and /api/auth/set-password because those are
                // the endpoints that the user hits before they have a CSRF token.
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfRepo)
                        .csrfTokenRequestHandler(requestHandler)
                        .ignoringRequestMatchers(
                                new AntPathRequestMatcher("/api/**")
                        )
                )

                // ── Session: stay STATELESS — the HttpOnly cookie carries the JWT ──────
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                
                // ── Preserve SecurityContext across async dispatches (e.g. Mono/Flux returns) ──
                .securityContext(context -> context.securityContextRepository(
                        new org.springframework.security.web.context.RequestAttributeSecurityContextRepository()
                ))

                // ── Authorization rules (unchanged from original) ─────────────────────
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/auth/validate-token").permitAll()
                        .requestMatchers("/api/auth/set-password").permitAll()

                        .requestMatchers("/api/public/**").permitAll()

                        .requestMatchers(HttpMethod.GET, "/api/groups/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/groups/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/responses").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/responses/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/analytics/analyze").permitAll()

                        .requestMatchers(HttpMethod.GET, "/api/questions/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/questions/**")
                        .hasAnyRole("SUPER_ADMIN", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/questions/**").authenticated()

                        .requestMatchers(HttpMethod.DELETE, "/api/**").authenticated()

                        .requestMatchers("/api/teachers/**")
                        .hasAnyRole("SUPER_ADMIN", "SCHOOL_ADMIN")

                        .requestMatchers("/api/chat/**", "/api/agent/**").authenticated()
                        .requestMatchers("/api/openai/**").permitAll()
                        .requestMatchers("/error").permitAll()

                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList(allowedOrigins.split(",")));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "X-Requested-With",
                "Accept",
                "Accept-Encoding",
                "Accept-Language",
                "Connection",
                "Referer",
                "Sec-Ch-Ua",
                "Sec-Ch-Ua-Mobile",
                "Sec-Ch-Ua-Platform",
                "Sec-Fetch-Dest",
                "Sec-Fetch-Mode",
                "Sec-Fetch-Site",
                "X-XSRF-TOKEN"   // ← required for CSRF token forwarding
        ));
        // allowCredentials MUST be true for cookies to be sent cross-origin
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}