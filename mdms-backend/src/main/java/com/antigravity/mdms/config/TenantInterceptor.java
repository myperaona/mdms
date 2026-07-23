package com.antigravity.mdms.config;

import org.apache.ibatis.executor.statement.StatementHandler;
import org.apache.ibatis.plugin.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.util.Properties;

@Component
@Intercepts({
    @Signature(type = StatementHandler.class, method = "prepare", args = {Connection.class, Integer.class})
})
public class TenantInterceptor implements Interceptor {
    private static final Logger log = LoggerFactory.getLogger(TenantInterceptor.class);

    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        Connection connection = (Connection) invocation.getArgs()[0];
        String tenantSchema = TenantContext.getCurrentTenantSchema();
        
        try (var stmt = connection.createStatement()) {
            if (tenantSchema != null && !tenantSchema.trim().isEmpty()) {
                // Secure schema check to prevent SQL injection (alphanumeric and underscore only, max 63 characters)
                if (tenantSchema.matches("^[a-zA-Z0-9_]{1,63}$")) {
                    log.debug("Setting PostgreSQL search_path to {}, public", tenantSchema);
                    stmt.execute("SET search_path TO " + tenantSchema + ", public");
                } else {
                    log.warn("Invalid tenant schema format detected: {}", tenantSchema);
                    stmt.execute("SET search_path TO public");
                }
            } else {
                log.debug("No tenant schema in context. Defaulting search_path to public");
                stmt.execute("SET search_path TO public");
            }
        } catch (Exception e) {
            log.error("Failed to set search_path", e);
        }
        
        return invocation.proceed();
    }

    @Override
    public Object plugin(Object target) {
        return Plugin.wrap(target, this);
    }

    @Override
    public void setProperties(Properties properties) {
    }
}
