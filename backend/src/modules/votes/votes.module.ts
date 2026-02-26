import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoteReport } from './vote-report.entity';
import { VoteEntry } from './vote-entry.entity';
import { User } from '../users/user.entity';
import { VotingTable } from '../tables/voting-table.entity';
import { Party } from '../parties/party.entity';
import { ElectionType } from '../election-types/election-type.entity';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';

@Module({
  imports: [TypeOrmModule.forFeature([VoteReport, VoteEntry, User, VotingTable, Party, ElectionType])],
  controllers: [VotesController],
  providers: [VotesService],
  exports: [VotesService],
})
export class VotesModule {}
