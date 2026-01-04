import { BadRequestException, Injectable } from '@nestjs/common';
import { CaseSeverity, CaseType, Role } from '@prisma/client';
import { haversineDistanceKm } from '../common/geo';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NgosService {
  constructor(private readonly prisma: PrismaService) {}

  private severityWeight(severity: CaseSeverity | null) {
    if (!severity) return 999;
    switch (severity) {
      case CaseSeverity.Critical:
        return 1;
      case CaseSeverity.Urgent:
        return 2;
      case CaseSeverity.Moderate:
        return 3;
      case CaseSeverity.Low:
        return 4;
      default:
        return 999;
    }
  }

  async nearbyCases(params: {
    userId: string;
    lat: number;
    lng: number;
    radiusKm?: number;
  }) {
    const { userId, lat, lng, radiusKm = 5 } = params;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('lat and lng are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ngoProfile: true },
    });

    if (!user || user.role !== Role.NGO || !user.ngoProfile) {
      throw new BadRequestException('NGO account required');
    }

    const cases = await this.prisma.case.findMany({
      where: {
        type: { not: CaseType.ADOPTION },
      },
      include: { reportedBy: true, assignedNgo: true },
    });

    return cases
      .map((c) => ({
        c,
        distance: haversineDistanceKm(lat, lng, c.latitude, c.longitude),
      }))
      .filter((x) => x.distance <= radiusKm)
      .sort((a, b) => {
        const sw = this.severityWeight(a.c.severity) - this.severityWeight(b.c.severity);
        if (sw !== 0) return sw;
        return a.distance - b.distance;
      })
      .map((x) => x.c);
  }
}
