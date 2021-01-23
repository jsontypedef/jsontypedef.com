package com.example;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import java.time.OffsetDateTime;

@JsonSerialize
public class User {
    @JsonProperty("createdAt")
    private OffsetDateTime createdAt;

    @JsonProperty("id")
    private String id;

    @JsonProperty("isAdmin")
    private Boolean isAdmin;

    @JsonProperty("karma")
    private Integer karma;

    public User() {
    }

    public OffsetDateTime getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Boolean getIsAdmin() {
        return this.isAdmin;
    }

    public void setIsAdmin(Boolean isAdmin) {
        this.isAdmin = isAdmin;
    }

    public Integer getKarma() {
        return this.karma;
    }

    public void setKarma(Integer karma) {
        this.karma = karma;
    }
}
