export type ProjectStatus = 'DRAFT' | 'IN_PROGRESS' | 'VALIDATION' | 'FINALIZED';

export interface Project {
  id: string;
  reference_code: string;
  name: string;
  organizing_museum: string;
  status: ProjectStatus;
  currency: string;
  target_budget?: number;
  created_at: string;
}

export interface Artwork {
  id: string;
  project_id: string;
  title: string;
  artist: string;
  dimensions_h_cm: number;
  dimensions_w_cm: number;
  dimensions_d_cm: number;
  weight_kg: number;
  typology: string; // TABLEAU, SCULPTURE, OBJET, INSTALLATION
  fragility?: 1 | 2 | 3 | 4 | 5; // 1=Standard, 5=Très fragile
  hasFragileFrame?: boolean; // Pour tableaux avec moulures
  lender_museum: string;
  lender_city: string;
  lender_country: string;
  insurance_value: number;

  // Résultats du moteur de calcul
  crate_specs?: {
    crate_type: 'MUSÉE' | 'VOYAGE';
    internal_dimensions: { h: number; w: number; d: number };
    external_dimensions: { h: number; w: number; d: number };
  };
  recommended_crate?: string; // Label du type de caisse
  crate_estimated_cost?: number; // Prix de vente final
  crate_factory_cost?: number; // Prix de revient (PR)
  crate_calculation_details?: string; // Breakdown détaillé

  notes?: string;
  image_data?: string; // Base64 string for local storage
  created_at: string;
}

export type FlowType = 'FRANCE_INTERNAL' | 'EU_ROAD' | 'AIR_FREIGHT' | 'DEDICATED_TRUCK' | 'ART_SHUTTLE';
export type FlowStatus = 'PENDING_QUOTE' | 'AWAITING_QUOTE' | 'QUOTE_RECEIVED' | 'VALIDATED';

export interface LogisticsFlow {
  id: string;
  project_id: string;
  origin_country: string;
  destination_country: string;
  origin_city?: string;
  destination_city?: string;
  flow_type: FlowType;
  assigned_agent_id?: string;
  validated_agent_name?: string;
  pickup_date?: string; // ISO Date "YYYY-MM-DD"
  delivery_date?: string; // ISO Date "YYYY-MM-DD"
  tracking_reference?: string; // AWB or BOL number
  status: FlowStatus;
  created_at: string;

  // Team Management
  team_members?: {
    role_id: string;
    role_name: string;
    count: number;
    daily_rate: number;
    hotel_category: 'STANDARD' | 'COMFORT' | 'PREMIUM';
  }[];
  mission_duration_days?: number;

  // Calculated Costs
  per_diem_total?: number;
  hotel_total?: number;
  ancillary_costs?: {
    id: string;
    name: string;
    amount: number;
  }[];
  ancillary_total?: number;
  transport_cost_total?: number;
  transport_cost_breakdown?: {
    distance_km: number;
    rate_per_km: number;
    base_fee: number;
  };
  team_cost_total?: number;
  steps?: LogisticsStep[];
}

export interface LogisticsStep {
  id: string;
  flow_id: string;
  label: string; // e.g., "Emballage Musée (Paris)"
  duration_days: number;
  team_composition: {
    role_id: string;
    count: number;
  }[];
  start_day: number; // Offset from flow start
}

export interface Crate {
  id: string;
  artwork_id: string;
  crate_type: string;
  inner_padding: string;
  calc_method: 'MATRIX_FRANCE' | 'AGENT_QUOTE';
  cost_price: number;
  selling_price: number;
  created_at: string;
}

export type QuoteLineCategory = 'PACKING' | 'TRANSPORT' | 'HANDLING' | 'COURIER' | 'CUSTOMS' | 'INSURANCE';

export interface QuoteLine {
  id: string;
  project_id: string;
  flow_id: string;
  category: QuoteLineCategory;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  source: 'CALCULATION' | 'AGENT' | 'MANUAL';
  agent_name?: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  description: string;
  status: 'PENDING' | 'DONE';
  due_date?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  created_at: string;
}

export interface Agent {
  id: string;
  name: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  specialties: string[]; // e.g. "Fine Art", "Crating", "Air Freight"
  rating: number; // 1-5
  notes?: string;
  created_at: string;
}

// Logistics Configuration Types
export interface TeamRole {
  id: string;
  name: string;
  daily_rate: number;
  requires_hotel: boolean;
  default_hotel_category: 'STANDARD' | 'COMFORT' | 'PREMIUM';
  color: string;
}

export interface AncillaryCostTemplate {
  id: string;
  category: 'FOOD' | 'LOCAL_TRANSPORT' | 'INSURANCE' | 'TELECOM' | 'EQUIPMENT';
  name: string;
  default_amount: number;
}

export interface LogisticsConfig {
  per_diem_rates: {
    [countryCode: string]: {
      standard: number;
      comfort: number;
      premium: number;
    };
  };
  hotel_rates: {
    standard: { min: number; max: number; default: number };
    comfort: { min: number; max: number; default: number };
    premium: { min: number; max: number; default: number };
  };
  team_roles: TeamRole[];
  ancillary_cost_templates: AncillaryCostTemplate[];
}

