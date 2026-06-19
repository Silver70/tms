import { Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { Roles } from '../../shared/decorators/roles.decorator';
import { Role } from '../../shared/enums/role.enum';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

/** Admin-only user management. Minimal surface for now. */
@Controller('users')
@Roles(Role.Admin)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.listAll();
    return users.map((u) => new UserResponseDto(u));
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserResponseDto> {
    return new UserResponseDto(await this.usersService.findByIdWithRole(id));
  }

  @Patch(':id/deactivate')
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserResponseDto> {
    return new UserResponseDto(await this.usersService.deactivate(id));
  }
}
