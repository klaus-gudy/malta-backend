import { Controller, Get, Param } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get(':entityId')
  forEntity(@Param('entityId') entityId: string) {
    return this.audit.forEntity(entityId);
  }
}
