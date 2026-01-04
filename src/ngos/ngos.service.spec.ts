import { Test, TestingModule } from '@nestjs/testing';
import { NgosService } from './ngos.service';

describe('NgosService', () => {
  let service: NgosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NgosService],
    }).compile();

    service = module.get<NgosService>(NgosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
