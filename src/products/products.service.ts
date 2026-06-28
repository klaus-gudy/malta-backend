import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
  ) {}

  findAll(): Promise<Product[]> {
    return this.products.find({ order: { id: 'ASC' } });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const count = await this.products.count();
    const id = 'PRD-' + String(count + 1).padStart(2, '0');
    const product = this.products.create({
      ...dto,
      id,
      status: dto.status || 'Active',
      desc: dto.desc || '',
    });
    return this.products.save(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.products.save(product);
  }
}
