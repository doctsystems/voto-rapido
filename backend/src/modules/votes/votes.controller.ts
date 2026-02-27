import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { VotesService, CreateReportDto } from './votes.service';

@ApiTags('votes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('votes')
export class VotesController {
  constructor(private readonly svc: VotesService) {}

  @Get('metrics')
  getMetrics(@CurrentUser() user: any) { return this.svc.getMetrics(user); }

  @Get('reports')
  findAll(@CurrentUser() user: any, @Query('schoolId') schoolId?: string) {
    return this.svc.findAll(user, { schoolId });
  }

  @Get('reports/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.findOne(id, user); }

  @Post('reports')
  @Roles(Role.DELEGADO, Role.JEFE_RECINTO)
  create(@Body() dto: CreateReportDto, @CurrentUser() user: any) { return this.svc.create(dto, user); }

  @Put('reports/:id')
  @Roles(Role.DELEGADO, Role.JEFE_RECINTO)
  update(@Param('id') id: string, @Body() dto: CreateReportDto, @CurrentUser() user: any) {
    return this.svc.update(id, dto, user);
  }

  @Patch('reports/:id/submit')
  @Roles(Role.DELEGADO, Role.JEFE_RECINTO)
  submit(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.submit(id, user); }

  @Patch('reports/:id/verify')
  @Roles(Role.ADMIN, Role.JEFE_CAMPANA, Role.JEFE_RECINTO)
  verify(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.verify(id, user); }

  @Delete('reports/:id')
  @Roles(Role.ADMIN, Role.JEFE_CAMPANA, Role.JEFE_RECINTO)
  remove(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.remove(id, user); }
}
