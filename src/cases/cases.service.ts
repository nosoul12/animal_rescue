import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CaseSeverity, CaseStatus, CaseType, Role } from '@prisma/client';
import { CloudinaryService } from '../common/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  listCases() {
    return this.prisma.case.findMany({
      where: {
        type: { not: CaseType.ADOPTION },
      },
      orderBy: { createdAt: 'desc' },
      include: { reportedBy: true, assignedNgo: true },
    });
  }

  async getCaseById(id: string) {
    const found = await this.prisma.case.findUnique({
      where: { id },
      include: { reportedBy: true, assignedNgo: true },
    });

    if (!found) throw new NotFoundException('Case not found');
    return found;
  }

  async createCase(params: {
    reportedById: string;
    body: any;
    file: Express.Multer.File;
  }) {
    const { reportedById, body, file } = params;

    const title = body?.title;
    const description = body?.description;
    const type = body?.type as CaseType | undefined;
    const severity = body?.severity as CaseSeverity | undefined;

    const latitudeRaw = body?.latitude ?? body?.lat;
    const longitudeRaw = body?.longitude ?? body?.lng;
    const latitude = Number(latitudeRaw);
    const longitude = Number(longitudeRaw);

    if (!title || !description) {
      throw new BadRequestException('title and description are required');
    }

    if (!type) {
      throw new BadRequestException('type is required');
    }

    if (!severity) {
      throw new BadRequestException('severity is required');
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new BadRequestException('latitude and longitude are required');
    }

    if (!file) {
      throw new BadRequestException('image is required');
    }

    const imageUrl = await this.cloudinary.uploadImage(file);

    const tags = Array.isArray(body?.tags)
      ? body.tags
      : typeof body?.tags === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(body.tags);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return body.tags
                .split(',')
                .map((t: string) => t.trim())
                .filter(Boolean);
            }
          })()
        : [];

    const animalCount =
      body?.animalCount === undefined || body?.animalCount === null
        ? undefined
        : Number(body.animalCount);

    return this.prisma.case.create({
      data: {
        title,
        description,
        type,
        severity,
        status: CaseStatus.Reported,
        latitude,
        longitude,
        imageUrl,
        animalType: body?.animalType ?? null,
        animalCount: Number.isFinite(animalCount) ? animalCount : null,
        tags,
        reportedById,
      },
      include: { reportedBy: true, assignedNgo: true },
    });
  }

  async updateCase(id: string, body: any) {
    const existing = await this.prisma.case.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Case not found');

    const data: any = {};

    if (typeof body?.title === 'string') data.title = body.title;
    if (typeof body?.description === 'string') data.description = body.description;
    if (body?.type) data.type = body.type;
    if (body?.severity !== undefined) data.severity = body.severity;
    if (body?.status) data.status = body.status;
    if (body?.latitude !== undefined) data.latitude = Number(body.latitude);
    if (body?.longitude !== undefined) data.longitude = Number(body.longitude);
    if (body?.animalType !== undefined) data.animalType = body.animalType;
    if (body?.animalCount !== undefined)
      data.animalCount =
        body.animalCount === null ? null : Number(body.animalCount);
    if (body?.tags !== undefined) data.tags = body.tags;

    return this.prisma.case.update({
      where: { id },
      data,
      include: { reportedBy: true, assignedNgo: true },
    });
  }

  async ngoRespondToCase(params: { caseId: string; userId: string }) {
    const { caseId, userId } = params;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ngoProfile: true },
    });

    if (!user || user.role !== Role.NGO) {
      throw new ForbiddenException('NGO role required');
    }

    if (!user.ngoProfile) {
      throw new ForbiddenException('NGO profile not found');
    }

    const existing = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!existing) throw new NotFoundException('Case not found');

    if (existing.assignedNgoId && existing.assignedNgoId !== user.ngoProfile.id) {
      throw new ForbiddenException('Case already assigned');
    }

    return this.prisma.case.update({
      where: { id: caseId },
      data: {
        status: CaseStatus.InProgress,
        assignedNgoId: user.ngoProfile.id,
      },
      include: { reportedBy: true, assignedNgo: true },
    });
  }
}
