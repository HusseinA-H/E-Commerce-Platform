import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('upload')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventory_manager')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload file to Cloudinary (Admin/Manager only)' })
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(jpg|jpeg|png|webp|gif|svg)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.cloudinaryService.uploadFile(file);
  }

  @Get()
  @ApiOperation({ summary: 'Filter and fetch product catalog items' })
  @ApiQuery({ name: 'categorySlug', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'sizes', required: false, type: String, isArray: true })
  @ApiQuery({ name: 'colors', required: false, type: String, isArray: true })
  @ApiQuery({ name: 'tech', required: false, type: String, isArray: true })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['price-asc', 'price-desc', 'newest'],
  })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  async findAll(
    @Query('categorySlug') categorySlug?: string,
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('sizes') sizes?: string | string[],
    @Query('colors') colors?: string | string[],
    @Query('tech') tech?: string | string[],
    @Query('sort') sort?: 'price-asc' | 'price-desc' | 'newest',
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    const sizeArr = typeof sizes === 'string' ? [sizes] : sizes;
    const colorArr = typeof colors === 'string' ? [colors] : colors;
    const techArr = typeof tech === 'string' ? [tech] : tech;

    return this.productsService.findAll({
      categorySlug,
      search,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sizes: sizeArr,
      colors: colorArr,
      tech: techArr,
      sort,
      includeDeleted: includeDeleted === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a single product detail by ID or slug' })
  async findById(@Param('id') id: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );
    return isUuid
      ? this.productsService.findById(id)
      : this.productsService.findBySlug(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Insert new sportswear product item (Admin/Manager only)',
  })
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Update an existing product specs or details (Admin/Manager only)',
  })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: Partial<CreateProductDto>,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventory_manager')
  @ApiOperation({
    summary:
      'Soft-delete a product from inventory catalog (Admin/Manager only)',
  })
  async delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }

  @Post(':id/restore')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Restore a soft-deleted product back to the catalog',
  })
  async restore(@Param('id') id: string) {
    return this.productsService.restore(id);
  }

  @Post(':id/featured')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Toggle product isFeatured parameter',
  })
  async toggleFeatured(@Param('id') id: string) {
    return this.productsService.toggleFeatured(id);
  }

  @Post('bulk/feature')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Bulk feature/unfeature products list',
  })
  async bulkFeature(
    @Body('ids') ids: string[],
    @Body('isFeatured') isFeatured: boolean,
  ) {
    return this.productsService.bulkFeature(ids, isFeatured);
  }

  @Post('bulk/archive')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Bulk archive/soft-delete products list',
  })
  async bulkArchive(@Body('ids') ids: string[]) {
    return this.productsService.bulkArchive(ids);
  }

  @Post('bulk/restore')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Bulk restore archived products list',
  })
  async bulkRestore(@Body('ids') ids: string[]) {
    return this.productsService.bulkRestore(ids);
  }

  @Post('bulk/stock')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Bulk update catalog stock levels',
  })
  async bulkStockUpdate(
    @Body('updates') updates: { id: string; stockQuantity: number }[],
  ) {
    return this.productsService.bulkStockUpdate(updates);
  }
}
