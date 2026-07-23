package com.antigravity.mdms.config;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        try {
            String jwt = getJwtFromRequest(request);

            if (jwt != null && jwtTokenProvider.validateToken(jwt)) {
                Claims claims = jwtTokenProvider.getClaims(jwt);
                String username = claims.getSubject();
                String tenantSchema = (String) claims.get("tenantSchema");
                String tenantId = (String) claims.get("tenantId");
                boolean mfaEnabled = (boolean) claims.get("mfaEnabled");
                boolean mfaVerified = (boolean) claims.get("mfaVerified");

                // Set tenant schema and ID context
                TenantContext.setCurrentTenantSchema(tenantSchema);
                TenantContext.setCurrentTenantId(tenantId);

                // Set Spring Security Context
                List<SimpleGrantedAuthority> authorities;
                if (mfaEnabled && !mfaVerified) {
                    authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_PRE_AUTH_MFA"));
                } else {
                    authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"));
                }

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        username, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            // Clear context after request finishes to avoid thread local leakage
            TenantContext.clear();
        }
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
