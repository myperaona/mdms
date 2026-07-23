package com.antigravity.mdms.config;

public class TenantContext {
    private static final ThreadLocal<String> CURRENT_TENANT_SCHEMA = new ThreadLocal<>();
    private static final ThreadLocal<String> CURRENT_TENANT_ID = new ThreadLocal<>();

    public static void setCurrentTenantSchema(String tenantSchema) {
        CURRENT_TENANT_SCHEMA.set(tenantSchema);
    }

    public static String getCurrentTenantSchema() {
        return CURRENT_TENANT_SCHEMA.get();
    }

    public static void setCurrentTenantId(String tenantId) {
        CURRENT_TENANT_ID.set(tenantId);
    }

    public static String getCurrentTenantId() {
        return CURRENT_TENANT_ID.get();
    }

    public static void clear() {
        CURRENT_TENANT_SCHEMA.remove();
        CURRENT_TENANT_ID.remove();
    }
}
