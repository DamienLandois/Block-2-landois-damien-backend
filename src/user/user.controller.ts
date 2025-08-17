import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Patch,
  Delete,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminOnly, UserOrAdmin } from '../auth/decorators/roles.decorator';
import { UserRole } from './enums/user-role.enum';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Get()
  // url: /users (exemple: http://localhost:3001/users)
  getUsers() {
    return this.userService.getUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UserOrAdmin()
  @Get('userId')
  // url: /users/:userId (exemple: http://localhost:3001/users/1)
  getUser(@Param('userId') userId: string) {
    return this.userService.getUser({ userId });
  }

  @Post()
  // url: /users/create (exemple: http://localhost:3001/users/create)
  createUser(@Body() body: CreateUserDto) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { role, ...userData } = body;
    return this.userService.createUser({ ...userData, role: UserRole.USER });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Post('admin')
  // url: /users/admin (exemple: http://localhost:3001/users/admin)
  createAdmin(@Body() body: CreateUserDto) {
    return this.userService.createUser(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UserOrAdmin()
  @Patch('userId')
  // url: /users/:userId (exemple: http://localhost:3001/users/1)
  updateUser(@Param('userId') userId: string, @Body() body: UpdateUserDto) {
    return this.userService.updateUser(userId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @UserOrAdmin()
  @Delete('userId')
  // url: /users/:userId (exemple: http://localhost:3001/users/1)
  @HttpCode(204)
  async deleteUser(@Param('userId') userId: string): Promise<void> {
    await this.userService.deleteUser(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  @Patch(':userId/role')
  // url: /users/:userId/role (exemple: http://localhost:3001/users/1/role)
  async changeUserRole(
    @Param('userId') userId: string,
    @Body() body: { role: UserRole },
  ) {
    return this.userService.updateUser(userId, { role: body.role });
  }
}
