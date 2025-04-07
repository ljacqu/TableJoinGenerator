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

        removeFilter(filter: ColumnFilter): void {
            if (!this.query?.where) {
                throw new Error('Query has no filters');
            }
            let foundMatch = false;
            this.query.where = this.query.where.filter(f => {
                // Delete only one matching filter
                if (foundMatch) {
                    return true;
                }

                const isMatch = this.matches(filter, f);
                if (isMatch) {
                    foundMatch = true;
                }
                return !isMatch;
            });
        }

        replaceFilter(oldFilter: ColumnFilter, newFilter: ColumnFilter): void {
            if (!this.query?.where) {
                throw new Error('Query has no filters');
            }
            for (let i = 0; i < this.query.where.length; ++i) {
                if (this.matches(oldFilter, this.query.where[i])) {
                    this.query.where[i] = newFilter;
                    return;
                }
            }
            throw new Error('Could not replace filter');
        }

        private matches(filter1: ColumnFilter, filter2: ColumnFilter): boolean {
            return filter1.table === filter2.table && filter1.column === filter2.column
                && (!filter1.tableAlias && !filter2.tableAlias || filter1.tableAlias === filter2.tableAlias)
                && filter1.type === filter2.type && filter1.value === filter2.value;
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

        // Can't put this into QueryService because Formatter is a dependency
        static inferOperatorForColumns(filters: ColumnFilter[]): {operator: string; columnFilters: ColumnFilter[]}[] {
            const filtersByColumn = QueryState.groupFiltersByColumn(filters);

            const filtersWithOperator = [];
            for (const columnFilters of filtersByColumn.values()) {
                if (columnFilters.length === 1) {
                    filtersWithOperator.push({operator: 'AND', columnFilters});
                } else {
                    const operator = this.determineOperator(columnFilters);
                    filtersWithOperator.push({operator, columnFilters});
                }
            }

            return filtersWithOperator;
        }

        private static determineOperator(filters: ColumnFilter[]): string {
            if (filters.length === 1) {
                return 'AND'; // doesn't matter
            } else if (filters.find(filter => filter.type === ColumnFilterType.NULL_FILTER
                                                       || filter.type === ColumnFilterType.PLAIN)) {
                return 'OR';
            }
            return 'AND';
        }

        private static groupFiltersByColumn(filters: ColumnFilter[]): Map<string, ColumnFilter[]> {
            const filtersByColumn = new Map<string, ColumnFilter[]>();
            filters.forEach(filter => {
                const key = `${filter.table}|${filter.column}|` + (filter.tableAlias ?? '');
                if (!filtersByColumn.has(key)) {
                    filtersByColumn.set(key, []);
                }
                filtersByColumn.get(key)!.push(filter);
            });
            return filtersByColumn;
        }
    }

    export type Query = {
        /** Columns to select. Empty/undef. = `SELECT *` */
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
                    public value: string,
                    public inputValue?: string,
                    public tableAlias?: string) {
        }

        static plainFilter(table: string, column: string, value: string, tableAlias?: string): ColumnFilter {
            return new ColumnFilter(table, column, ColumnFilterType.PLAIN, value, undefined, tableAlias);
        }

        static nullFilter(table: string, column: string, value: string, tableAlias?: string): ColumnFilter {
            return new ColumnFilter(table, column, ColumnFilterType.NULL_FILTER, value, undefined, tableAlias);
        }
    }

    export enum ColumnFilterType {
        PLAIN,
        TIMESTAMP_INTERVAL,
        NULL_FILTER,
        NUMBER_COMPARISON
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