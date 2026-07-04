package com.mymercurie.chat.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FlaggedChatStatsResponse {

    /** Total flags created today */
    private long totalFlaggedToday;

    /** Flags created in the last hour */
    private long flaggedLastHour;

    /** Critical flags still pending action */
    private long criticalPending;

    /** Percentage of flags that are ASSIGNED or RESOLVED */
    private double resolvedOrAssignedPercent;

    /** Average minutes between flag creation and first assignment/resolution */
    private double averageResponseMinutes;
}