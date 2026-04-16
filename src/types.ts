export type IncidentType = 'delayed' | 'failed' | 'claim' | 'refund';
export type IncidentStatus = 'active' | 'resolved' | 'escalated';

export interface Incident {
  id: string;
  type: IncidentType;
  zone: string;
  status: IncidentStatus;
  timestamp: string;
  description: string;
}

export interface ZoneStats {
  zone: string;
  count: number;
  avgResolutionTime: number;
}
