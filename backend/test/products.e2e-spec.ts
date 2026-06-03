import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('ProductsController (e2e)', () => {
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

  it('/products (GET) - should return product list', () => {
    return request(app.getHttpServer())
      .get('/products')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('/products (POST) - should require admin role (return 401/403 without auth)', () => {
    return request(app.getHttpServer())
      .post('/products')
      .send({
        name: 'Test Product',
        slug: 'test-product',
        price: 199.99,
        stockCount: 10,
        categoryId: 'test',
        brand: 'APEX',
      })
      .expect((res) => {
        expect([401, 403]).toContain(res.status);
      });
  });
});
