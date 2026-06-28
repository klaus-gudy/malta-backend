import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import {
  CreateApplicationDto,
  PatchApplicationDto,
} from './dto/application.dto';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  findAll() {
    return this.applications.findAll();
  }

  @Post()
  create(@Body() dto: CreateApplicationDto) {
    return this.applications.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.applications.findOne(id);
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() dto: PatchApplicationDto) {
    return this.applications.patch(id, dto);
  }
}
