import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Base price per m² in XOF by city + type
const BASE_PRICE: Record<string, Record<string, number>> = {
  Dakar: {
    apartment: 1_200_000, villa: 1_800_000, house: 1_000_000,
    land: 800_000, office: 1_400_000, commercial: 1_300_000,
    building: 1_100_000, other: 900_000,
  },
  'Abidjan': {
    apartment: 1_400_000, villa: 2_000_000, house: 1_100_000,
    land: 900_000, office: 1_600_000, commercial: 1_500_000,
    building: 1_200_000, other: 1_000_000,
  },
};

const FALLBACK_PRICE: Record<string, number> = {
  apartment: 500_000, villa: 800_000, house: 450_000,
  land: 300_000, office: 600_000, commercial: 550_000,
  building: 500_000, parking: 200_000, other: 400_000,
};

const AMENITY_BONUS: Record<string, number> = {
  pool: 0.08, garden: 0.04, garage: 0.03, elevator: 0.03,
  security: 0.02, gym: 0.02, concierge: 0.02,
};

const CITY_MULTIPLIER: Record<string, number> = {
  'Plateau': 1.4, 'Almadies': 1.35, 'Mermoz': 1.25, 'Fann': 1.2,
  'Cocody': 1.3, 'Marcory': 1.1, 'Yopougon': 0.85,
  'Pikine': 0.75, 'Guédiawaye': 0.7, 'Rufisque': 0.65,
  'Thiès': 0.5, 'Saint-Louis': 0.45, 'Ziguinchor': 0.4,
};

@Injectable()
export class EstimationService {
  constructor(private prisma: PrismaService) {}

  compute(dto: {
    type: string;
    transaction: 'sale' | 'rent';
    city: string;
    neighborhood?: string;
    surface: number;
    rooms?: number;
    bedrooms?: number;
    amenities?: string[];
  }): { min: number; max: number; currency: string; perSqm: number } {
    const cityPrices = BASE_PRICE[dto.city] ?? FALLBACK_PRICE;
    let pricePerSqm: number = (cityPrices as any)[dto.type] ?? FALLBACK_PRICE[dto.type] ?? 500_000;

    // Neighborhood multiplier
    if (dto.neighborhood) {
      const mult = CITY_MULTIPLIER[dto.neighborhood];
      if (mult) pricePerSqm *= mult;
    }

    // Amenities bonus
    let amenityBonus = 0;
    for (const amenity of dto.amenities ?? []) {
      amenityBonus += AMENITY_BONUS[amenity] ?? 0;
    }
    pricePerSqm *= (1 + amenityBonus);

    // Rooms bonus (+2% per extra bedroom > 2)
    if (dto.bedrooms && dto.bedrooms > 2) {
      pricePerSqm *= 1 + (dto.bedrooms - 2) * 0.02;
    }

    let base = pricePerSqm * dto.surface;

    // Rent: convert sale price to monthly rent (1/180 rule)
    if (dto.transaction === 'rent') {
      base = base / 180;
      pricePerSqm = pricePerSqm / 180;
    }

    // ±12% range
    const margin = 0.12;
    return {
      min: Math.round(base * (1 - margin) / 10_000) * 10_000,
      max: Math.round(base * (1 + margin) / 10_000) * 10_000,
      perSqm: Math.round(pricePerSqm),
      currency: 'XOF',
    };
  }

  async save(userId: string | null, dto: {
    type: string;
    transaction: 'sale' | 'rent';
    city: string;
    neighborhood?: string;
    surface: number;
    rooms?: number;
    bedrooms?: number;
    amenities?: string[];
    email?: string;
  }, result: { min: number; max: number }) {
    return this.prisma.estimation.create({
      data: {
        userId: userId ?? undefined,
        type: dto.type,
        city: dto.city,
        neighborhood: dto.neighborhood,
        surface: dto.surface,
        rooms: dto.rooms,
        bedrooms: dto.bedrooms,
        amenities: dto.amenities ?? [],
        estimatedPriceMin: result.min,
        estimatedPriceMax: result.max,
        email: dto.email,
      },
    });
  }

  async history(userId: string) {
    return this.prisma.estimation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  // Rental yield calculator
  yieldCalc(dto: { purchasePrice: number; monthlyRent: number; charges?: number }) {
    const annualRent = dto.monthlyRent * 12;
    const annualCharges = (dto.charges ?? 0) * 12;
    const grossYield = (annualRent / dto.purchasePrice) * 100;
    const netYield = ((annualRent - annualCharges) / dto.purchasePrice) * 100;
    return {
      grossYield: Math.round(grossYield * 100) / 100,
      netYield: Math.round(netYield * 100) / 100,
      annualRent,
      paybackYears: Math.round(dto.purchasePrice / (annualRent - annualCharges)),
    };
  }
}
