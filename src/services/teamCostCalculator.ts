import { LogisticsConfig, TeamRole, LogisticsStep } from "@/types";
import { getPerDiem, getHotelRate, getZoneForCity } from "@/config/logistics";

interface TeamMember {
    role_id: string;
    role_name: string;
    count: number;
    daily_rate: number;
    hotel_category: 'STANDARD' | 'COMFORT' | 'PREMIUM';
}

interface TeamCostResult {
    per_diem_total: number;
    per_diem_breakdown: {
        role: string;
        count: number;
        daily_rate: number;
        days: number;
        total: number;
    }[];
    hotel_total: number;
    hotel_breakdown: {
        role: string;
        count: number;
        nights: number;
        rate_per_night: number;
        total: number;
    }[];
    salary_total: number;
    team_total: number;
}

/**
 * Calculate costs for a specific set of team members and duration
 */
export function calculateStepCosts(
    teamMembers: TeamMember[],
    missionDays: number,
    city: string = '',
    country: string = '',
    config: LogisticsConfig
): TeamCostResult {
    const zone = getZoneForCity(city, country);
    const perDiemRate = getPerDiem(zone);
    const hotelRate = getHotelRate(zone);

    const nights = Math.max(0, missionDays - 1);

    const perDiemBreakdown = teamMembers.map(member => ({
        role: member.role_name,
        count: member.count,
        daily_rate: perDiemRate,
        days: missionDays,
        total: member.count * perDiemRate * missionDays
    }));

    const hotelBreakdown = teamMembers.map(member => ({
        role: member.role_name,
        count: member.count,
        nights,
        rate_per_night: hotelRate,
        total: member.count * hotelRate * nights
    }));

    const salaryTotal = teamMembers.reduce((sum, member) => {
        return sum + (member.count * member.daily_rate * missionDays);
    }, 0);

    const perDiemTotal = perDiemBreakdown.reduce((sum, item) => sum + item.total, 0);
    const hotelTotal = hotelBreakdown.reduce((sum, item) => sum + item.total, 0);

    return {
        per_diem_total: perDiemTotal,
        per_diem_breakdown: perDiemBreakdown,
        hotel_total: hotelTotal,
        hotel_breakdown: hotelBreakdown,
        salary_total: salaryTotal,
        team_total: perDiemTotal + hotelTotal + salaryTotal
    };
}

/**
 * Calculate total team costs based on mission steps
 */
export function calculateTeamCostsFromSteps(
    steps: LogisticsStep[],
    destinationCity: string,
    destinationCountry: string,
    config: LogisticsConfig,
    allRoles: TeamRole[]
): TeamCostResult & { steps_breakdown: any[] } {
    let per_diem_total = 0;
    let hotel_total = 0;
    let salary_total = 0;
    const steps_breakdown: any[] = [];

    steps.forEach(step => {
        const teamMembers: TeamMember[] = step.team_composition.map(tc => {
            const role = allRoles.find(r => r.id === tc.role_id);
            return {
                role_id: tc.role_id,
                role_name: role?.name || 'Unknown',
                count: tc.count,
                daily_rate: role?.daily_rate || 0,
                hotel_category: role?.default_hotel_category || 'STANDARD'
            };
        });

        const stepResult = calculateStepCosts(
            teamMembers,
            step.duration_days,
            destinationCity, // For now assuming destination zone applies to all steps if outside France
            destinationCountry,
            config
        );

        per_diem_total += stepResult.per_diem_total;
        hotel_total += stepResult.hotel_total;
        salary_total += stepResult.salary_total;
        steps_breakdown.push({
            label: step.label,
            ...stepResult
        });
    });

    return {
        per_diem_total,
        per_diem_breakdown: [], // Consolidated breakdown could be added if needed
        hotel_total,
        hotel_breakdown: [],
        salary_total,
        team_total: per_diem_total + hotel_total + salary_total,
        steps_breakdown
    };
}

/**
 * Legacy support for standard team members array
 */
export function calculateTeamCosts(
    teamMembers: TeamMember[],
    missionDays: number,
    destinationCountry: string,
    config: LogisticsConfig
): TeamCostResult {
    return calculateStepCosts(teamMembers, missionDays, '', destinationCountry, config);
}
