import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { SchoolsService, CreateSchoolDto } from './schools.service';

@ApiTags('schools')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schools')
export class SchoolsController {
  constructor(private readonly service: SchoolsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar unidades educativas' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una unidad educativa con sus mesas' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear unidad educativa' })
  create(@Body() dto: CreateSchoolDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar unidad educativa' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateSchoolDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar unidad educativa (solo si no tiene mesas)' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
