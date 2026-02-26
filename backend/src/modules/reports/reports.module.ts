import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoteReport } from '../votes/vote-report.entity';
import { VoteEntry } from '../votes/vote-entry.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([VoteReport, VoteEntry])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
