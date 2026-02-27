import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { ElectionTypesService, CreateElectionTypeDto } from './election-types.service';

@ApiTags('election-types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('election-types')
export class ElectionTypesController {
  constructor(private readonly service: ElectionTypesService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateElectionTypeDto, @CurrentUser() u: any) { return this.service.create(dto, u.sub); }

  @Put(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateElectionTypeDto>, @CurrentUser() u: any) {
    return this.service.update(id, dto, u.sub);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() u: any) { return this.service.remove(id, u.sub); }
}
