import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('export/excel')
  @ApiOperation({ summary: 'Exportar reporte en Excel' })
  exportExcel(@CurrentUser() user: any, @Res() res: Response) {
    return this.service.exportExcel(user, res);
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Exportar reporte en PDF' })
  exportPdf(@CurrentUser() user: any, @Res() res: Response) {
    return this.service.exportPdf(user, res);
  }
}
