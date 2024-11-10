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

        getPreviousColumn(): Column | null {
            return this.query.getPreviousColumn();
        }

        collectTopLevelTables(): Set<string> {
            return this.query.collectTopLevelTables();
        }

        showWhereQueryInButton(): boolean {
            return this.configShowWhereInButton && !this.query.hasWhereInClause();
        }

        getPastColumns(): Set<Column> {
            return this.query.getPastColumns();
        }

        hasColumnSelect(table: string, column: string): boolean {
            return this.query.hasColumnSelect(table, column);
        }

        private updateQueryOnPage() {
            DocElemHelper.getElementById('query').innerHTML = this.formatter.generateQuery(this.query.getQuery());
            if (this.configDebugEnabled) {
                DocElemHelper.getElementById('query_debug').innerHTML =
                    JSON.stringify(this.query.getQuery()).replaceAll('{', '{ ');
            }
        }
    }
}
