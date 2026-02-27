import { IsString, IsEmail, IsEnum, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @IsString() username: string;
  @IsEmail() email: string;
  @IsString() password: string;
  @IsString() fullName: string;
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsUUID() partyId?: string;
  @IsOptional() @IsUUID() tableId?: string;
  @IsOptional() @IsUUID() schoolId?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() username?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() password?: string;
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsUUID() partyId?: string;
  @IsOptional() @IsUUID() tableId?: string;
  @IsOptional() @IsUUID() schoolId?: string;
}
