import { BadRequestException, Injectable } from '@nestjs/common';
import { CaseType } from '@prisma/client';
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
}
