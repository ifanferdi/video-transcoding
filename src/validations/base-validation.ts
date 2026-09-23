import { isString } from 'lodash';
import { EnumLike, z } from 'zod';

const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Invalid date format (YYYY-MM-DD)' })
  .refine((val) => !isString(new Date(val).getTime()), { message: 'Invalid date value' });

export const StringSchema = z.string().trim();
export const BooleanSchema = z.boolean();
export const NumberSchema = z.number();
export const DateSchema = z.union([DateStringSchema, z.date()]);
export const BasePagination = <T extends EnumLike>(columns: T) => {
  const SortFieldEnum = z.nativeEnum(columns);
  const SortDirectionEnum = z.enum(['asc', 'desc']).optional();

  return z.object({
    page: NumberSchema.default(1),
    limit: z.union([z.literal(-1), NumberSchema.optional()]).default(10),
    orderBy: z.array(z.object({ field: SortFieldEnum, direction: SortDirectionEnum })).optional(),
    columns: z.array(z.nativeEnum(columns)).optional(),
    search: StringSchema.optional(),
    ids: z.array(NumberSchema).optional(),
    notId: z.union([NumberSchema, z.array(NumberSchema)]).optional(),
  });
};

export const BaseFindById = z.object({ id: NumberSchema });

export const Username = StringSchema.min(1, 'Username cannot be empty.').min(3).max(255);
export const Password = StringSchema.min(1, 'Password cannot be empty.').max(255);

export interface BaseFindById extends z.infer<typeof BaseFindById> {}
export type NumberSchema = z.infer<typeof NumberSchema>;
