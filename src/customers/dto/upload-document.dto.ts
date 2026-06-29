import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty({ message: 'Document name is required.' })
  name: string;

  // Base64 string or data URL of the file contents.
  @IsString()
  @IsNotEmpty({ message: 'Document contents are required.' })
  content: string;

  @IsOptional()
  @IsString()
  fileName?: string;
}
