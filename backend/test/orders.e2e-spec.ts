import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('OrdersController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/orders (POST) - should return 401 when unauthenticated', () => {
    return request(app.getHttpServer())
      .post('/orders')
      .send({
        items: [
          { productId: 'test-id', quantity: 1, size: 'M', color: 'Black' },
        ],
        shippingAddress: {
          addressLine1: '123 Test St',
          city: 'Test City',
          country: 'Test Country',
          postalCode: '12345',
        },
      })
      .expect(401);
  });
});
