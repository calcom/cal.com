/**
 * Team DTOs - Data Transfer Objects for team data
 */

/**
 * Team information nested in event type
 */
export interface TeamSummaryDto {
  id: number;
  name: string;
  parentId: number | null;
}
