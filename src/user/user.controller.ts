import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Patch,
  Delete,
  HttpCode,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  // url: /users (exemple: http://localhost:3001/users)
  getUsers() {
    return this.userService.getUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Get('userId')
  // url: /users/:userId (exemple: http://localhost:3001/users/1)
  getUser(@Param('userId') userId: string) {
    return this.userService.getUser({ userId });
  }

  @Post()
  // url: /users/create (exemple: http://localhost:3001/users/create)
  createUser(@Body() body: CreateUserDto) {
    return this.userService.createUser(body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('userId')
  // url: /users/:userId (exemple: http://localhost:3001/users/1)
  updateUser(@Param('userId') userId: string, @Body() body: UpdateUserDto) {
    return this.userService.updateUser(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('userId')
  // url: /users/:userId (exemple: http://localhost:3001/users/1)
  @HttpCode(204)
  async deleteUser(@Param('userId') userId: string): Promise<void> {
    await this.userService.deleteUser(userId);
  }
}
