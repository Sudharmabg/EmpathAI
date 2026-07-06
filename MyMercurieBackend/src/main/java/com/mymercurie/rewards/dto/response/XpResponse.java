package com.mymercurie.rewards.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class XpResponse {
    private Long studentId;
    private int xp;
    private int xpEarned;
}