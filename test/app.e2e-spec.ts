import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { CaseStatus, CaseType, Role } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppConfigService } from '../src/config/config.service';
import { CloudinaryService } from '../src/common/cloudinary.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';

type TestUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  ngoProfile?: { id: string; userId: string; name: string; phone: string; verified: boolean } | null;
};

type TestCase = {
  id: string;
  title: string;
  description: string;
  type: CaseType;
  severity: string | null;
  status: CaseStatus;
  latitude: number;
  longitude: number;
  imageUrl: string;
  reportedById: string;
  assignedNgoId?: string | null;
  assignedNgo?: any;
  reportedBy?: any;
};

class PrismaServiceMock {
  users: TestUser[] = [];
  cases: TestCase[] = [];

  resetData() {
    const citizen: TestUser = {
      id: 'citizen-1',
      name: 'Citizen One',
      email: 'citizen@example.com',
      role: Role.Citizen,
    };

    const ngoUser: TestUser = {
      id: 'ngo-user-1',
      name: 'Helping Hands',
      email: 'ngo1@example.com',
      role: Role.NGO,
      ngoProfile: {
        id: 'ngo-profile-1',
        userId: 'ngo-user-1',
        name: 'Helping Hands',
        phone: '123',
        verified: true,
      },
    };

    const otherNgo: TestUser = {
      id: 'ngo-user-2',
      name: 'Rescue Squad',
      email: 'ngo2@example.com',
      role: Role.NGO,
      ngoProfile: {
        id: 'ngo-profile-2',
        userId: 'ngo-user-2',
        name: 'Rescue Squad',
        phone: '456',
        verified: true,
      },
    };

    this.users = [citizen, ngoUser, otherNgo];

    this.cases = [
      {
        id: 'adopt-1',
        title: 'Puppy for adoption',
        description: 'Healthy and vaccinated',
        type: CaseType.ADOPTION,
        severity: null,
        status: CaseStatus.Reported,
        latitude: 0,
        longitude: 0,
        imageUrl: 'https://example.com/img1',
        reportedById: citizen.id,
        assignedNgoId: ngoUser.ngoProfile!.id,
        assignedNgo: { user: { id: ngoUser.id, name: ngoUser.name, email: ngoUser.email } },
        reportedBy: { id: citizen.id, name: citizen.name, email: citizen.email },
      },
      {
        id: 'case-1',
        title: 'Injured stray',
        description: 'Needs help',
        type: CaseType.INJURED,
        severity: 'Urgent',
        status: CaseStatus.InProgress,
        latitude: 0,
        longitude: 0,
        imageUrl: 'https://example.com/img2',
        reportedById: citizen.id,
        assignedNgoId: ngoUser.ngoProfile!.id,
        assignedNgo: { user: { id: ngoUser.id, name: ngoUser.name, email: ngoUser.email } },
        reportedBy: { id: citizen.id, name: citizen.name, email: citizen.email },
      },
      {
        id: 'adopt-2',
        title: 'Kittens seeking home',
        description: 'Two playful kittens',
        type: CaseType.ADOPTION,
        severity: null,
        status: CaseStatus.Reported,
        latitude: 0,
        longitude: 0,
        imageUrl: 'https://example.com/img3',
        reportedById: citizen.id,
        assignedNgoId: otherNgo.ngoProfile!.id,
        assignedNgo: { user: { id: otherNgo.id, name: otherNgo.name, email: otherNgo.email } },
        reportedBy: { id: citizen.id, name: citizen.name, email: citizen.email },
      },
    ];
  }

  user = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.users.find((u) => u.id === where.id) ?? null,
  };

  case = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.cases.find((c) => c.id === where.id) ?? null,
    delete: async ({ where }: { where: { id: string } }) => {
      const index = this.cases.findIndex((c) => c.id === where.id);
      if (index === -1) {
        throw new Error('Not found');
      }
      const [removed] = this.cases.splice(index, 1);
      return removed;
    },
  };
}

describe('NGO delete endpoints (e2e)', () => {
  let app: INestApplication;
  let prismaMock: PrismaServiceMock;
  let currentUser: { userId: string; role: Role };

  const fakeConfig = {
    jwtSecret: 'test-secret',
    databaseUrl: 'postgres://example',
    cloudinary: {
      cloudName: 'cloud',
      apiKey: 'key',
      apiSecret: 'secret',
    },
  } as unknown as AppConfigService;

  const createApp = async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AppConfigService)
      .useValue(fakeConfig)
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(CloudinaryService)
      .useValue({ uploadImage: jest.fn() })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = currentUser;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  };

  beforeEach(async () => {
    prismaMock = new PrismaServiceMock();
    prismaMock.resetData();
    currentUser = { userId: 'ngo-user-1', role: Role.NGO };
    await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('DELETE /adoptions/:id', () => {
    it('allows assigned NGO to delete an adoption', async () => {
      const response = await request(app.getHttpServer())
        .delete('/adoptions/adopt-1')
        .expect(200);

      expect(response.body.id).toBe('adopt-1');
      expect(prismaMock.cases.find((c) => c.id === 'adopt-1')).toBeUndefined();
    });

    it('rejects non-NGO roles', async () => {
      currentUser = { userId: 'citizen-1', role: Role.Citizen };

      await request(app.getHttpServer())
        .delete('/adoptions/adopt-1')
        .expect(403);
    });

    it('rejects NGOs not assigned to the adoption', async () => {
      currentUser = { userId: 'ngo-user-2', role: Role.NGO };

      await request(app.getHttpServer())
        .delete('/adoptions/adopt-1')
        .expect(403);
    });
  });

  describe('DELETE /cases/:id', () => {
    it('allows assigned NGO to delete a case', async () => {
      const response = await request(app.getHttpServer())
        .delete('/cases/case-1')
        .expect(200);

      expect(response.body.id).toBe('case-1');
      expect(prismaMock.cases.find((c) => c.id === 'case-1')).toBeUndefined();
    });

    it('rejects NGOs not assigned to the case', async () => {
      currentUser = { userId: 'ngo-user-2', role: Role.NGO };

      await request(app.getHttpServer())
        .delete('/cases/case-1')
        .expect(403);
    });

    it('rejects non-NGO roles', async () => {
      currentUser = { userId: 'citizen-1', role: Role.Citizen };

      await request(app.getHttpServer())
        .delete('/cases/case-1')
        .expect(403);
    });
  });
});
