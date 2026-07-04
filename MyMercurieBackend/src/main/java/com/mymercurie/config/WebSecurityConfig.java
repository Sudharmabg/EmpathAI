package com.mymercurie.config;

import com.mymercurie.user.security.JwtAuthenticationFilter;
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
        csrfRepo.setCookiePath("/");
        // CookieCsrfTokenRepository sets the cookie name to XSRF-TOKEN by default.
        // The frontend must read this cookie and send its value in the X-XSRF-TOKEN header.
        CsrfTokenRequestAttributeHandler requestHandler = new CsrfTokenRequestAttributeHandler();
        requestHandler.setCsrfRequestAttributeName("_csrf");

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // ── CSRF protection (re-enabled now that we are NOT using localStorage) ──
                // We exempt /api/auth/login and /api/auth/set-password because those are
                // the endpoints that the user hits before they have a CSRF token.
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfRepo)
                        .csrfTokenRequestHandler(requestHandler)
                        .ignoringRequestMatchers(
                                // Auth endpoints (no token available yet)
                                new AntPathRequestMatcher("/api/auth/login"),
                                new AntPathRequestMatcher("/api/auth/set-password"),
                                new AntPathRequestMatcher("/api/auth/validate-token"),
                                new AntPathRequestMatcher("/api/health/ai-service"),
                                new AntPathRequestMatcher("/metrics"),
                                new AntPathRequestMatcher("/api/public/**"),
                                // All REST API mutation endpoints — already protected by
                                // HttpOnly JWT cookie + SameSite policy; CSRF adds no
                                // extra security here but causes stale-cookie 403s.
                                new AntPathRequestMatcher("/api/assessment/**", "POST"),
                                new AntPathRequestMatcher("/api/assessment/**", "PUT"),
                                new AntPathRequestMatcher("/api/assessment/**", "DELETE"),
                                new AntPathRequestMatcher("/api/responses/**", "POST"),
                                new AntPathRequestMatcher("/api/responses", "POST"),
                                new AntPathRequestMatcher("/api/groups/**", "POST"),
                                new AntPathRequestMatcher("/api/groups/**", "DELETE"),
                                new AntPathRequestMatcher("/api/questions/**", "POST"),
                                new AntPathRequestMatcher("/api/questions/**", "PUT"),
                                new AntPathRequestMatcher("/api/questions/**", "DELETE"),
                                new AntPathRequestMatcher("/api/analytics/**", "POST")
                        )
                )

                // ── Session: stay STATELESS — the HttpOnly cookie carries the JWT ──────
                .sessionManagement(sm -> sm
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                        .sessionAuthenticationStrategy(new org.springframework.security.web.authentication.session.NullAuthenticatedSessionStrategy())
                )
                
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

                        .requestMatchers("/api/health/ai-service", "/metrics").permitAll()
                        .requestMatchers("/api/public/**").permitAll()

                        .requestMatchers(HttpMethod.GET, "/api/groups/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/groups/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/responses").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/responses/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/analytics/analyze").authenticated()

                        .requestMatchers(HttpMethod.GET, "/api/questions/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/questions/**")
                        .hasAnyRole("SUPER_ADMIN", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/questions/**").authenticated()

                        .requestMatchers(HttpMethod.DELETE, "/api/**").authenticated()

                        .requestMatchers("/api/teachers/**")
                        .hasAnyRole("SUPER_ADMIN", "SCHOOL_ADMIN")

                        .requestMatchers("/api/chat/**", "/api/agent/**").authenticated()
                        .requestMatchers("/api/openai/**").authenticated()
                        .requestMatchers("/error").permitAll()

                        .anyRequest().authenticated()
                )
                .headers(headers -> headers
                        .frameOptions(fo -> fo.deny())
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000))
                )
                .authenticationProvider(authenticationProvider)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(new CsrfCookieFilter(csrfRepo), org.springframework.security.web.csrf.CsrfFilter.class);

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

    private static class CsrfCookieFilter extends org.springframework.web.filter.OncePerRequestFilter {
        private final org.springframework.security.web.csrf.CsrfTokenRepository csrfTokenRepository;

        public CsrfCookieFilter(org.springframework.security.web.csrf.CsrfTokenRepository csrfTokenRepository) {
            this.csrfTokenRepository = csrfTokenRepository;
        }

        @Override
        protected void doFilterInternal(jakarta.servlet.http.HttpServletRequest request,
                                        jakarta.servlet.http.HttpServletResponse response,
                                        jakarta.servlet.FilterChain filterChain)
                throws jakarta.servlet.ServletException, java.io.IOException {
            org.springframework.security.web.csrf.CsrfToken csrfToken = 
                    (org.springframework.security.web.csrf.CsrfToken) request.getAttribute(org.springframework.security.web.csrf.CsrfToken.class.getName());
            
            if (csrfToken == null) {
                csrfToken = csrfTokenRepository.loadToken(request);
                if (csrfToken == null) {
                    csrfToken = csrfTokenRepository.generateToken(request);
                }
                csrfTokenRepository.saveToken(csrfToken, request, response);
            } else {
                csrfToken.getToken(); // Forces token resolution and cookie generation
                csrfTokenRepository.saveToken(csrfToken, request, response);
            }
            
            filterChain.doFilter(request, response);
        }
    }
}