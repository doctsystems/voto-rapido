import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { TablesService, CreateTableDto } from './tables.service';

@ApiTags('tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tables')
export class TablesController {
  constructor(private readonly service: TablesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mesas. Filtrar por ?schoolId=uuid' })
  findAll(@Query('schoolId') schoolId?: string) {
    if (schoolId) return this.service.findBySchool(schoolId);
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateTableDto, @CurrentUser() u: any) {
    return this.service.create(dto, u.sub);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateTableDto>, @CurrentUser() u: any) {
    return this.service.update(id, dto, u.sub);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() u: any) {
    return this.service.remove(id, u.sub);
  }
}
