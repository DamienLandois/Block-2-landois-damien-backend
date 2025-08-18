import { ApiBody } from '@nestjs/swagger';

export function ApiOptionalFile(fileName = 'image') {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const requestBodySchema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nom du massage',
        },
        description: {
          type: 'string',
          description: 'Description du massage',
        },
        duration: {
          type: 'integer',
          description: 'Durée du massage en minutes',
        },
        price: {
          type: 'number',
          description: 'Prix du massage en euros',
        },
        position: {
          type: 'integer',
          description: 'Position du massage dans la liste',
        },
        [fileName]: {
          type: 'string',
          format: 'binary',
          description: 'Image du massage (optionnel)',
        },
      },
      required: ['name', 'description', 'duration', 'price', 'position'],
    };

    return ApiBody({
      schema: requestBodySchema,
    })(target, propertyKey, descriptor);
  };
}
