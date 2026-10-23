export interface Repository<
  FindAll,
  FindOne,
  Create,
  Update,
  Entity = Record<string, any>,
  Delete = number | number[],
> {
  findAll(params: FindAll): Promise<Entity[]>;
  count(params: FindAll): Promise<number>;
  findOne(params: FindOne, options?: any): Promise<Entity> | Entity;
  store(params: Create): Promise<Entity>;
  bulkStore?(params: Create[]): Promise<Entity>;
  update(params: Update): Promise<Entity | null>;
  destroy(id: Delete): Promise<any>;
}

export interface SoftDelete {
  restore: (id: number | number[]) => Promise<any>;
  deletePermanently: (id: number | number[]) => Promise<any>;
}
