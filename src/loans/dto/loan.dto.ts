import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DisburseDto {
  @IsString() @IsNotEmpty() applicationId: string;
  @IsString() @IsNotEmpty() channel: string;
}

export class TakePaymentDto {
  // Amount is recorded for the receipt; the schedule advances by one instalment.
  @IsOptional() @IsNumber() @Min(0) amount?: number;
}
