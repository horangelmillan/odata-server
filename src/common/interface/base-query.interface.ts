export interface BaseQuery {
    execute(params?: any): Promise<any>;
}
