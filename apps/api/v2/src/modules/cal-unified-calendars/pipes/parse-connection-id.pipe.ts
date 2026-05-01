import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

@Injectable()
export class ParseConnectionIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = parseInt(value, 10);
    if (Number.isNaN(id)) {
      throw new BadRequestException("Invalid connectionId");
    }
    return id;
  }
}
