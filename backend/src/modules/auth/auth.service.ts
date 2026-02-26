import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.userRepo.findOne({
      where: [{ username }, { email: username }],
      relations: ['party', 'table'],
    });

    if (!user || !user.isActive) {
      this.logger.warn(`Login fallido para usuario: ${username}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isValid = await user.validatePassword(password);
    if (!isValid) {
      this.logger.warn(`Contraseña incorrecta para usuario: ${username}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      partyId: user.party?.id,
      tableId: user.table?.id,
    };

    const token = this.jwtService.sign(payload);
    this.logger.log(`Login exitoso: ${user.username} (${user.role})`);

    return {
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        party: user.party ? { id: user.party.id, name: user.party.name, acronym: user.party.acronym, color: user.party.color } : null,
        table: user.table ? { id: user.table.id, tableNumber: user.table.tableNumber, location: user.table.location } : null,
      },
    };
  }

  async getProfile(userId: string) {
    return this.userRepo.findOne({
      where: { id: userId },
      relations: ['party', 'table'],
    });
  }
}
