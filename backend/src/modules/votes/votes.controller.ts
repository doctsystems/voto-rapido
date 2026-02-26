import { Controller, Get, Post, Param, Body, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VotesService, CreateReportDto } from './votes.service';

@ApiTags('votes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('votes')
export class VotesController {
  constructor(private readonly service: VotesService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Métricas de votos según rol' })
  getMetrics(@CurrentUser() user: any) { return this.service.getMetrics(user); }

  @Get('reports')
  @ApiOperation({ summary: 'Listar reportes según rol' })
  findAll(@CurrentUser() user: any) { return this.service.findAll(user); }

  @Get('reports/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Post('reports')
  @ApiOperation({ summary: 'Crear reporte de votación (delegado)' })
  create(@Body() dto: CreateReportDto, @CurrentUser() user: any) {
    return this.service.create(dto, user);
  }

  @Patch('reports/:id/submit')
  @ApiOperation({ summary: 'Enviar reporte (cambiar de DRAFT a SUBMITTED)' })
  submit(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.submit(id, user);
  }

  @Patch('reports/:id/verify')
  @ApiOperation({ summary: 'Verificar reporte (ADMIN / JEFE_CAMPAÑA)' })
  verify(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.verify(id, user);
  }
}
