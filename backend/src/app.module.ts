import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PartiesModule } from './modules/parties/parties.module';
import { TablesModule } from './modules/tables/tables.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { ElectionTypesModule } from './modules/election-types/election-types.module';
import { VotesModule } from './modules/votes/votes.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { FixConstraintsService } from './database/fix-constraints.subscriber';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.name'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get('database.synchronize'),
        logging: config.get('database.logging'),
      }),
    }),
    AuthModule, UsersModule, PartiesModule, TablesModule,
    SchoolsModule, ElectionTypesModule, VotesModule, ReportsModule, AuditModule,
  ],
  providers: [FixConstraintsService],
})
export class AppModule {}
