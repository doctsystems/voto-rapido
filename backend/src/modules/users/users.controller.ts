import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.JEFE_CAMPANA, Role.JEFE_RECINTO)
  findAll(@CurrentUser() user: any) { return this.usersService.findAll(user); }

  @Get(':id')
  @Roles(Role.ADMIN, Role.JEFE_CAMPANA, Role.JEFE_RECINTO)
  findOne(@Param('id') id: string) { return this.usersService.findOne(id); }

  @Post()
  @Roles(Role.ADMIN, Role.JEFE_CAMPANA, Role.JEFE_RECINTO)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: any) { return this.usersService.create(dto, user); }

  @Put(':id')
  @Roles(Role.ADMIN, Role.JEFE_CAMPANA, Role.JEFE_RECINTO)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: any) {
    return this.usersService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) { return this.usersService.remove(id, user); }
}
