import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Party } from './party.entity';
import { PartyElectionType } from './party-election-type.entity';
import { ElectionType } from '../election-types/election-type.entity';
import { PartiesController } from './parties.controller';
import { PartiesService } from './parties.service';

@Module({
  imports: [TypeOrmModule.forFeature([Party, PartyElectionType, ElectionType])],
  controllers: [PartiesController],
  providers: [PartiesService],
  exports: [PartiesService],
})
export class PartiesModule {}
