package com.empathai.user.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String COOKIE_NAME = "jwt";

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String requestURI = request.getRequestURI();
        logger.debug("JWT_LOG: Processing " + request.getMethod() + " " + requestURI);

        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            logger.debug("JWT_LOG: Found " + cookies.length + " cookies in request.");
            for (Cookie cookie : cookies) {
                logger.debug("JWT_LOG: Cookie name = " + cookie.getName() + 
                            ", value length = " + (cookie.getValue() != null ? cookie.getValue().length() : 0));
            }
        } else {
            logger.debug("JWT_LOG: request.getCookies() is null (no cookies sent by browser).");
        }

        // ── 1. Extract JWT from the HttpOnly cookie (not the Authorization header) ──
        String jwt = extractJwtFromCookie(request);
        logger.debug("JWT_LOG: Extracted JWT token = " + (jwt != null ? "PRESENT" : "MISSING"));

        // ── 2. If no cookie token found, fall back to Authorization header ──────────
        //       (keeps Swagger / Postman / API clients working during migration)
        if (jwt == null) {
            final String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                jwt = authHeader.substring(7);
            }
        }

        // ── 3. If still no token, skip to the next filter ───────────────────────────
        if (jwt == null) {
            filterChain.doFilter(request, response);
            return;
        }

        // ── 4. Validate token and set authentication in the security context ─────────
        try {
            final String username = jwtService.extractUsername(jwt);
            logger.debug("JWT_LOG: Extracted username = " + username);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    logger.debug("JWT_LOG: Authentication successful, SecurityContext set for " + username);
                } else {
                    logger.warn("JWT_LOG: Token validation failed (isTokenValid returned false) for " + username);
                }
            } else if (username == null) {
                logger.warn("JWT_LOG: Extracted username is null");
            } else {
                logger.debug("JWT_LOG: SecurityContext already had authentication: " + 
                            SecurityContextHolder.getContext().getAuthentication().getName());
            }
        } catch (Exception e) {
            // Invalid / expired token — do not set authentication; the request will be rejected downstream
            logger.warn("JWT_LOG: JWT validation failed with exception: " + e.getMessage(), e);
        }

        filterChain.doFilter(request, response);
    }

    // ── Helper: find the "jwt" cookie in the request ─────────────────────────
    private String extractJwtFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    @Override
    protected boolean shouldNotFilterAsyncDispatch() {
        return false;
    }

    @Override
    protected boolean shouldNotFilterErrorDispatch() {
        return false;
    }
}