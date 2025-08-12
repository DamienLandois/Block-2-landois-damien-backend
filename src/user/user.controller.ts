import { Controller, Get, Param } from '@nestjs/common';
import { UserService } from './user.service';


@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get()
    // url: /users (exemple: http://localhost:3001/users)
    getUsers() {
        return this.userService.getUsers();
    }

    @Get(':userId')
    // url: /users/:userId (exemple: http://localhost:3001/users/1)
    getUser(@Param('userId') userId: string) {
        return this.userService.getUser({ userId });
    }
}
