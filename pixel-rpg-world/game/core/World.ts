export type EntityId = number;

export class World {
  private nextEntityId = 1;
  private readonly entities = new Set<EntityId>();
  private readonly stores = new Map<string, Map<EntityId, unknown>>();

  // 创建稳定且不复用的运行时实体编号。
  createEntity(): EntityId {
    const entity = this.nextEntityId;
    this.nextEntityId += 1;
    this.entities.add(entity);
    return entity;
  }

  // 删除实体时同步清理它在所有组件表里的数据。
  destroyEntity(entity: EntityId): void {
    this.entities.delete(entity);
    for (const store of this.stores.values()) {
      store.delete(entity);
    }
  }

  hasEntity(entity: EntityId): boolean {
    return this.entities.has(entity);
  }

  setComponent<T>(name: string, entity: EntityId, value: T): void {
    if (!this.entities.has(entity)) {
      throw new Error(`Unknown entity: ${entity}`);
    }

    let store = this.stores.get(name);
    if (!store) {
      store = new Map<EntityId, unknown>();
      this.stores.set(name, store);
    }
    store.set(entity, value);
  }

  getComponent<T>(name: string, entity: EntityId): T | undefined {
    return this.stores.get(name)?.get(entity) as T | undefined;
  }

  removeComponent(name: string, entity: EntityId): boolean {
    return this.stores.get(name)?.delete(entity) ?? false;
  }

  // 返回同时拥有指定组件的存活实体，顺序始终按实体编号稳定。
  entitiesWith(...names: string[]): EntityId[] {
    return [...this.entities]
      .filter((entity) => names.every((name) => this.stores.get(name)?.has(entity)))
      .sort((left, right) => left - right);
  }
}
