import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElectionType } from './election-type.entity';
import { ElectionTypesController } from './election-types.controller';
import { ElectionTypesService } from './election-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([ElectionType])],
  controllers: [ElectionTypesController],
  providers: [ElectionTypesService],
  exports: [ElectionTypesService],
})
export class ElectionTypesModule {}
