import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CaseType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../common/cloudinary.service';

@Injectable()
export class AdoptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async listAdoptions() {
    const adoptions = await this.prisma.case.findMany({
      where: { type: CaseType.ADOPTION },
      orderBy: { createdAt: 'desc' },
      include: { 
        reportedBy: true, 
        assignedNgo: {
          include: { user: true }
        }
      },
    });
    
    // Transform assignedNgo to include user data for Flutter compatibility
    return adoptions.map(a => ({
      ...a,
      assignedNgo: a.assignedNgo ? {
        id: a.assignedNgo.user.id,
        name: a.assignedNgo.user.name,
        email: a.assignedNgo.user.email,
      } : null,
    }));
  }

  async createAdoption(params: {
    reportedById: string;
    body: any;
    file: Express.Multer.File;
  }) {
    const { reportedById, body, file } = params;

    const title = body?.title;
    const description = body?.description;

    const latitudeRaw = body?.latitude ?? body?.lat;
    const longitudeRaw = body?.longitude ?? body?.lng;

    const latitude = Number(latitudeRaw);
    const longitude = Number(longitudeRaw);

    if (!title || !description) {
      throw new BadRequestException('title and description are required');
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
        type: CaseType.ADOPTION,
        severity: null,
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

  async deleteAdoption(params: { caseId: string; userId: string }) {
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
    if (!existing || existing.type !== CaseType.ADOPTION) {
      throw new NotFoundException('Adoption not found');
    }

    if (existing.assignedNgoId && existing.assignedNgoId !== user.ngoProfile.id) {
      throw new ForbiddenException('Adoption assigned to another NGO');
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
