export interface BaseService<T = any> {
    findById(id: T): Promise<any> | any;
    findAll(options: object): Promise<any> | any;
    create(data: any): Promise<any> | any;
    update(data: any, id: number): Promise<any> | any;
    delete(id: T): Promise<any> | any;
}
