import { Test, TestingModule } from '@nestjs/testing';
import { NgosController } from './ngos.controller';

describe('NgosController', () => {
  let controller: NgosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NgosController],
    }).compile();

    controller = module.get<NgosController>(NgosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
