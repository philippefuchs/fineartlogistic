import { LogisticsConfig } from "@/types";

export const COST_ZONES = {
    'PREMIUM': {
        name: 'Zone A (NY, London, Paris, Tokyo)',
        hotel: 250,
        per_diem: 90,
        cities: ['NEW YORK', 'NY', 'LONDON', 'PARIS', 'TOKYO', 'GENEVA', 'ZURICH']
    },
    'STANDARD': {
        name: 'Zone B (Europe, Province, Asia Regular)',
        hotel: 140,
        per_diem: 65,
        cities: [] // Default if not in premium
    }
};

export function getZoneForCity(city: string = '', country: string = ''): 'PREMIUM' | 'STANDARD' {
    const normalizedCity = city.toUpperCase().trim();
    const premiumCities = COST_ZONES.PREMIUM.cities;

    if (premiumCities.some(pc => normalizedCity.includes(pc))) return 'PREMIUM';

    // Simple heuristic for countries
    const premiumCountries = ['USA', 'UK', 'SWITZERLAND', 'JAPAN', 'SINGAPORE'];
    if (premiumCountries.includes(country.toUpperCase().trim())) return 'PREMIUM';

    return 'STANDARD';
}

export function getPerDiem(zone: 'PREMIUM' | 'STANDARD'): number {
    return COST_ZONES[zone].per_diem;
}

export function getHotelRate(zone: 'PREMIUM' | 'STANDARD'): number {
    return COST_ZONES[zone].hotel;
}
export const DEFAULT_LOGISTICS_CONFIG: LogisticsConfig = {
    per_diem_rates: {
        'FR': { standard: 70, comfort: 90, premium: 120 },
        'USA': { standard: 90, comfort: 120, premium: 180 },
        'UK': { standard: 85, comfort: 110, premium: 160 }
    },
    hotel_rates: {
        standard: { min: 80, max: 150, default: 120 },
        comfort: { min: 150, max: 300, default: 220 },
        premium: { min: 300, max: 800, default: 450 }
    },
    team_roles: [
        {
            id: 'regisseur',
            name: 'Régisseur de Collection',
            daily_rate: 800,
            requires_hotel: true,
            default_hotel_category: 'COMFORT',
            color: '#8b5cf6'
        },
        {
            id: 'technicien',
            name: 'Technicien Emballeur',
            daily_rate: 550,
            requires_hotel: true,
            default_hotel_category: 'STANDARD',
            color: '#3b82f6'
        },
        {
            id: 'convoyeur',
            name: 'Convoyeur / Superviseur',
            daily_rate: 750,
            requires_hotel: true,
            default_hotel_category: 'PREMIUM',
            color: '#f59e0b'
        },
        {
            id: 'chauffeur',
            name: 'Chauffeur VL/PL',
            daily_rate: 650,
            requires_hotel: true,
            default_hotel_category: 'STANDARD',
            color: '#10b981'
        }
    ],
    ancillary_cost_templates: [
        { id: 't1', category: 'FOOD', name: 'Repas Supplémentaire', default_amount: 35 },
        { id: 't2', category: 'LOCAL_TRANSPORT', name: 'Taxi / VTC', default_amount: 50 },
        { id: 't3', category: 'EQUIPMENT', name: 'Location Outillage', default_amount: 100 }
    ]
};
