import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { PartiesService, CreatePartyDto, AssignElectionTypeDto } from './parties.service';

@ApiTags('parties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parties')
export class PartiesController {
  constructor(private readonly service: PartiesService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get('with-election-types')
  @ApiOperation({ summary: 'Partidos con sus tipos de elección asignados (para ingreso de votos)' })
  getPartiesWithElectionTypes() { return this.service.getPartiesWithElectionTypes(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreatePartyDto, @CurrentUser() u: any) { return this.service.create(dto, u.sub); }

  @Put(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreatePartyDto>, @CurrentUser() u: any) {
    return this.service.update(id, dto, u.sub);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() u: any) { return this.service.remove(id, u.sub); }

  @Post(':id/election-types')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Asignar tipo de elección a un partido (con nombre de candidato opcional)' })
  assignElectionType(@Param('id') id: string, @Body() dto: AssignElectionTypeDto) {
    return this.service.assignElectionType(id, dto);
  }

  @Delete(':id/election-types/:electionTypeId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remover tipo de elección de un partido' })
  removeElectionType(@Param('id') id: string, @Param('electionTypeId') etId: string) {
    return this.service.removeElectionType(id, etId);
  }
}
