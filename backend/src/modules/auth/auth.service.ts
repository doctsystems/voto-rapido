import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../users/user.entity";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.userRepo.findOne({
      where: { username },
      relations: ["party", "table", "table.school", "school"],
    });

    if (!user || !user.isActive) {
      this.logger.warn(`Login fallido: ${username}`);
      throw new UnauthorizedException("Credenciales inválidas");
    }

    if (!(await user.validatePassword(password))) {
      this.logger.warn(`Contraseña incorrecta: ${username}`);
      throw new UnauthorizedException("Credenciales inválidas");
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      partyId: user.party?.id,
      tableId: user.table?.id,
      /** For JEFE_RECINTO: the recinto they manage */
      schoolId: user.school?.id ?? user.table?.school?.id,
    };

    const token = this.jwtService.sign(payload);
    this.logger.log(`Login: ${user.username} (${user.role})`);

    return {
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        party: user.party
          ? {
              id: user.party.id,
              name: user.party.name,
              ballotOrder: user.party.ballotOrder,
              acronym: user.party.acronym,
              color: user.party.color,
            }
          : null,
        table: user.table
          ? {
              id: user.table.id,
              number: user.table.number,
              code: user.table.code,
              totalVoters: user.table.totalVoters ?? null,
              school: user.table.school ?? null,
            }
          : null,
        school: user.school
          ? {
              id: user.school.id,
              name: user.school.name,
              code: user.school.code,
            }
          : null,
      },
    };
  }

  async getProfile(userId: string) {
    return this.userRepo.findOne({
      where: { id: userId },
      relations: ["party", "table", "table.school", "school"],
    });
  }
}
