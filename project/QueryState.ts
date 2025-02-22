namespace QB {

    export class QueryState {

        private query?: Query;
        private pastColumns: Set<Column> = new Set();

        clearState(): void {
            this.query = undefined;
            this.pastColumns = new Set();
        }

        selectTable(table: string): void {
            this.query = {table};
            this.pastColumns.add({table: table, column: ''});
        }

        selectTableWithFilter(table: string, filter: ColumnFilter): void {
            this.query = {
                table,
                where: [filter]
            };
            this.pastColumns.add({table: table, column: filter.column});
        }

        addFilter(filter: ColumnFilter): void {
            if (!this.query) {
                throw new Error('Expected query to be set');
            }
            if (!this.query.where) {
                this.query.where = [];
            }
            this.query.where.push(filter);
        }

        addFilterToSubQuery(filter: ColumnFilter): void {
            if (!this.query?.sub) {
                throw new Error('Expect subquery to be set!');
            }

            this.query.sub.where = this.query.sub.where ?? [];
            this.query.sub.where.push(filter);
            this.pastColumns.add({
                table: this.query.sub.table,
                column: filter.column
            });
        }

        addSuperQuery(column: string, parentTable: string, parentColumn: string): void {
            if (!this.query) {
                throw new Error('Query must be defined');
            }

            this.query.select = [{
                table: this.query.table,
                column: column
            }];
            this.query.aggregate = false;

            this.query = {
                table: parentTable,
                subqueryFilterColumn: parentColumn,
                sub: this.query
            };

            this.pastColumns.add({table: this.query.sub!.table, column: column});
        }

        addSubQuery(column: string, childTable: string, childColumn: string): void {
            if (!this.query) {
                throw new Error('Query must be defined');
            }

            this.query.subqueryFilterColumn = column;
            this.query.sub = {
                select: [{column: childColumn, table: childTable}],
                table: childTable
            };
            this.pastColumns.add({table: childTable, column: childColumn});
        }

        addLeftJoin(leftJoin: QueryLeftJoin): void {
            if (!this.query!.leftJoin) {
                this.query!.leftJoin = [];
            }
            this.query!.leftJoin.push(leftJoin);
        }

        setAggregate(aggregate: boolean): void {
            this.query!.aggregate = aggregate;
        }

        clearColumnSelects(): void {
            this.query!.select = [];
        }

        addColumnSelect(table: string, column: string, manualAlias?: string): void {
            if (!this.query!.select) {
                this.query!.select = [];
            }
            this.query!.select.push({table, column, manualAlias});
        }

        // ---------
        // Getters
        // ---------

        getCurrentSelectedTable(): string {
            return this.query!.table;
        }

        collectTopLevelTables(): Set<string> {
            const tables = new Set<string>();
            tables.add(this.query!.table);
            if (this.query!.leftJoin) {
                for (const leftJoin of this.query!.leftJoin) {
                    tables.add(leftJoin.sourceTable);
                    tables.add(leftJoin.targetTable);
                }
            }
            return tables;
        }

        hasWhereInClause(): boolean {
            return !!this.query?.subqueryFilterColumn;
        }

        hasColumnSelect(table: string, column: string, alias?: string): boolean {
            if (!this.query || !this.query.select) {
                return false;
            }
            return this.query.select.some(
                select => select.table === table
                && select.column === column
                && select.manualAlias === alias);
        }

        hasAnyColumnSelect(): boolean {
            if (this.query?.select) {
                return this.query.select.length > 0;
            }
            return false;
        }

        getQuery(): Query | null {
            return this.query || null;
        }

        getPastColumns(): Set<Column> {
            return this.pastColumns;
        }
    }

    export type Query = {
        /** Columns to select. Empty/undef. = SELECT * */
        select?: Column[];
        /** Table to reference in the FROM section. */
        table: string;
        /** Tables to left join. */
        leftJoin?: QueryLeftJoin[];
        /** Column filters. */
        where?: ColumnFilter[];
        /** Column the subquery relates to -- (WHERE ${subqueryFilterColumn} IN (${sub}) */
        subqueryFilterColumn?: string;
        /** Subquery. */
        sub?: Query;
        /** If true, adds a COUNT() in the select. */
        aggregate?: boolean;
    };

    export class ColumnFilter {

        constructor(public table: string,
                    public column: string,
                    public type: ColumnFilterType,
                    public value: string) {
        }

        static plainFilter(table: string, column: string, value: string): ColumnFilter {
            return new ColumnFilter(table, column, ColumnFilterType.PLAIN, value);
        }
    }

    export enum ColumnFilterType {
        PLAIN,
        TIMESTAMP_INTERVAL,
        NULL_FILTER
    }

    export type QueryLeftJoin = {
        sourceTable:  string;
        sourceColumn: string;
        sourceTableAlias?: string;
        targetTable:  string;
        targetColumn: string;
        targetTableAlias?: string;
        joinVariantFilter?: string;
        joinVariantName?: string;
    };
}