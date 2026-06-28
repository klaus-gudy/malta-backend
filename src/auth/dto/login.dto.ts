import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  // Email or its local-part (e.g. "joseph.admin").
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
