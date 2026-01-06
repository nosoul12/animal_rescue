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

  async listCases() {
    const cases = await this.prisma.case.findMany({
      where: {
        type: { not: CaseType.ADOPTION },
      },
      orderBy: { createdAt: 'desc' },
      include: { 
        reportedBy: true, 
        assignedNgo: {
          include: { user: true }
        }
      },
    });
    
    // Transform assignedNgo to include user data for Flutter compatibility
    return cases.map(c => ({
      ...c,
      assignedNgo: c.assignedNgo ? {
        id: c.assignedNgo.user.id,
        name: c.assignedNgo.user.name,
        email: c.assignedNgo.user.email,
      } : null,
    }));
  }

  async getCaseById(id: string) {
    const found = await this.prisma.case.findUnique({
      where: { id },
      include: { 
        reportedBy: true, 
        assignedNgo: {
          include: { user: true }
        }
      },
    });

    if (!found) throw new NotFoundException('Case not found');
    
    // Transform assignedNgo to include user data for Flutter compatibility
    return {
      ...found,
      assignedNgo: found.assignedNgo ? {
        id: found.assignedNgo.user.id,
        name: found.assignedNgo.user.name,
        email: found.assignedNgo.user.email,
      } : null,
    };
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

    const created = await this.prisma.case.create({
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
      include: { 
        reportedBy: true, 
        assignedNgo: {
          include: { user: true }
        }
      },
    });
    
    // Transform assignedNgo to include user data for Flutter compatibility
    return {
      ...created,
      assignedNgo: created.assignedNgo ? {
        id: created.assignedNgo.user.id,
        name: created.assignedNgo.user.name,
        email: created.assignedNgo.user.email,
      } : null,
    };
  }

  async updateCase(id: string, body: any, userId: string) {
    const existing = await this.prisma.case.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Case not found');

    // Only the case creator can update the case
    if (existing.reportedById !== userId) {
      throw new ForbiddenException('Only the case creator can update this case');
    }

    const data: any = {};

    if (typeof body?.title === 'string') data.title = body.title;
    if (typeof body?.description === 'string') data.description = body.description;
    if (body?.type) data.type = body.type;
    if (body?.severity !== undefined) data.severity = body.severity;
    // Don't allow status updates through this endpoint - use the status endpoint instead
    if (body?.latitude !== undefined) data.latitude = Number(body.latitude);
    if (body?.longitude !== undefined) data.longitude = Number(body.longitude);
    if (body?.animalType !== undefined) data.animalType = body.animalType;
    if (body?.animalCount !== undefined)
      data.animalCount =
        body.animalCount === null ? null : Number(body.animalCount);
    if (body?.tags !== undefined) data.tags = body.tags;

    const updated = await this.prisma.case.update({
      where: { id },
      data,
      include: { 
        reportedBy: true, 
        assignedNgo: {
          include: { user: true }
        }
      },
    });
    
    // Transform assignedNgo to include user data for Flutter compatibility
    return {
      ...updated,
      assignedNgo: updated.assignedNgo ? {
        id: updated.assignedNgo.user.id,
        name: updated.assignedNgo.user.name,
        email: updated.assignedNgo.user.email,
      } : null,
    };
  }

  async updateCaseStatus(
    caseId: string,
    status: string,
    userId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { ngoProfile: true },
    });

    if (!user || user.role !== Role.NGO) {
      throw new ForbiddenException('NGO role required');
    }

    const existing = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!existing) throw new NotFoundException('Case not found');

    // Validate status
    const validStatuses = Object.values(CaseStatus);
    if (!validStatuses.includes(status as CaseStatus)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updateData: any = { status: status as CaseStatus };

    // If assigning to InProgress and not already assigned, assign to this NGO
    if (status === CaseStatus.InProgress && !existing.assignedNgoId && user.ngoProfile) {
      updateData.assignedNgoId = user.ngoProfile.id;
    }

    const updated = await this.prisma.case.update({
      where: { id: caseId },
      data: updateData,
      include: { 
        reportedBy: true, 
        assignedNgo: {
          include: { user: true }
        }
      },
    });
    
    // Transform assignedNgo to include user data for Flutter compatibility
    return {
      ...updated,
      assignedNgo: updated.assignedNgo ? {
        id: updated.assignedNgo.user.id,
        name: updated.assignedNgo.user.name,
        email: updated.assignedNgo.user.email,
      } : null,
    };
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

    const updated = await this.prisma.case.update({
      where: { id: caseId },
      data: {
        status: CaseStatus.InProgress,
        assignedNgoId: user.ngoProfile.id,
      },
      include: { 
        reportedBy: true, 
        assignedNgo: {
          include: { user: true }
        }
      },
    });
    
    // Transform assignedNgo to include user data for Flutter compatibility
    return {
      ...updated,
      assignedNgo: updated.assignedNgo ? {
        id: updated.assignedNgo.user.id,
        name: updated.assignedNgo.user.name,
        email: updated.assignedNgo.user.email,
      } : null,
    };
  }

  async deleteCase(params: { caseId: string; userId: string }) {
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
    if (!existing || existing.type === CaseType.ADOPTION) {
      throw new NotFoundException('Case not found');
    }

    if (existing.assignedNgoId && existing.assignedNgoId !== user.ngoProfile.id) {
      throw new ForbiddenException('Case assigned to another NGO');
    }

    const deleted = await this.prisma.case.delete({
      where: { id: caseId },
      include: {
        reportedBy: true,
        assignedNgo: {
          include: { user: true },
        },
      },
    });

    return {
      ...deleted,
      assignedNgo: deleted.assignedNgo
        ? {
            id: deleted.assignedNgo.user.id,
            name: deleted.assignedNgo.user.name,
            email: deleted.assignedNgo.user.email,
          }
        : null,
    };
  }
}
