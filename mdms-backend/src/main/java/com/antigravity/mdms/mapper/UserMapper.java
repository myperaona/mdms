package com.antigravity.mdms.mapper;

import com.antigravity.mdms.model.AppUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.UUID;

@Mapper
public interface UserMapper {
    AppUser findByUsername(@Param("username") String username);
    AppUser findByEmail(@Param("email") String email);
    void insert(AppUser user);
    void updateMfaSecret(@Param("id") UUID id, @Param("mfaSecret") String mfaSecret, @Param("mfaEnabled") boolean mfaEnabled);
}
