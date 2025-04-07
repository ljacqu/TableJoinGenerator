namespace QB {

    export class QueryService {

        constructor(private query: QueryState,
                    private formatter: Formatter,
                    private configDebugEnabled: boolean,
                    private configShowWhereInButton: boolean) {
        }

        updateQuery(queryFn: (query: QueryState) => void) {
            queryFn(this.query);
            this.updateQueryOnPage();
        }

        collectTopLevelTables(): Set<string> {
            return this.query.collectTopLevelTables();
        }

        collectSelectedTableAliasPairs(): { table: string; manualAlias: string | undefined }[] {
            const aliasesByTable = new Map<string, Set<string | undefined>>();
            aliasesByTable.set(this.query.getCurrentSelectedTable(), new Set<string | undefined>([ undefined ]));

            this.getLeftJoins().forEach(lj => {
                const sourceAliases = aliasesByTable.get(lj.sourceTable);
                if (sourceAliases === undefined) {
                    aliasesByTable.set(lj.sourceTable, new Set<string | undefined>([ lj.sourceTableAlias ]));
                } else {
                    sourceAliases.add(lj.sourceTableAlias);
                }
                const targetAliases = aliasesByTable.get(lj.targetTable);
                if (targetAliases === undefined) {
                    aliasesByTable.set(lj.targetTable, new Set<string | undefined>([ lj.targetTableAlias ]));
                } else {
                    targetAliases.add(lj.targetTableAlias);
                }
            });

            const result: { table: string; manualAlias: string | undefined }[] = [];
            for (let [table, aliases] of aliasesByTable) {
                aliases.forEach(alias => {
                    result.push({table: table, manualAlias: alias});
                });
            }
            return result;
        }

        getLeftJoins(): QueryLeftJoin[] {
            return this.query.getQuery()?.leftJoin ?? [];
        }

        showWhereQueryInButton(): boolean {
            return this.configShowWhereInButton && !this.query.hasWhereInClause();
        }

        getPastColumns(): Set<Column> {
            return this.query.getPastColumns();
        }

        hasColumnSelect(table: string, column: string, alias?: string): boolean {
            return this.query.hasColumnSelect(table, column, alias);
        }

        hasAnyColumnSelect(): boolean {
            return this.query.hasAnyColumnSelect();
        }

        hasFilterOnColumn(table: string, column: string, tableAlias?: string): boolean {
            const filters = this.query.getQuery()?.where;
            if (filters) {
                return filters.some(filter => filter.table === table && filter.column === column
                    && (!tableAlias && !filter.tableAlias || tableAlias === filter.tableAlias));
            }
            return false;
        }

        getFilters(table: string, column: string, tableAlias?: string): ColumnFilter[] {
            const filters = this.query.getQuery()?.where;
            if (filters) {
                return filters.filter(filter => filter.table === table && filter.column === column
                        && (!tableAlias && !filter.tableAlias || tableAlias === filter.tableAlias));
            }
            return [];
        }

        private updateQueryOnPage() {
            const queryHtml = this.formatter.generateQuery(this.query.getQuery());
            DocElemHelper.getElementById('query').innerHTML = queryHtml;
            DocElemHelper.getElementById('btn_copy').style.display = !!queryHtml ? 'inline-block' : 'none';
            if (this.configDebugEnabled) {
                DocElemHelper.getElementById('query_debug').innerHTML =
                    JSON.stringify(this.query.getQuery()).replaceAll('{', '{ ');
            }
        }
    }
}
