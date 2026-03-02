import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('app.jwtSecret'),
    });
  }

  async validate(payload: any) {
    // Always load fresh user data from DB to avoid stale JWT claims
    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      relations: ['party', 'table', 'table.school', 'school'],
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Usuario no encontrado o inactivo');

    return {
      sub:      user.id,
      username: user.username,
      role:     user.role,
      partyId:  user.party?.id,
      tableId:  user.table?.id,
      // JEFE_RECINTO uses school; fallback to table's school for DELEGADO
      schoolId: user.school?.id ?? user.table?.school?.id,
    };
  }
}
